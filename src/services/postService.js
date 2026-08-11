import { prisma } from '../config/database.js';
import { generateSlug, generateUniqueSlug } from '../utils/slug.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from '../utils/errors.js';
import { POST_STATUS } from '../config/constants.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';

function slugExists(slug) {
  return prisma.post.findUnique({ where: { slug } }).then((post) => !!post);
}

export async function createPost(authorId, data, req) {
  const { title, excerpt, content, status, featuredImage, categoryId, tags } = data;

  const baseSlug = generateSlug(title);
  const slug = await generateUniqueSlug(baseSlug, slugExists);

  let publishedAt = null;
  if (status === POST_STATUS.PUBLISHED) {
    publishedAt = new Date();
  }

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      excerpt,
      content,
      status,
      featuredImage,
      authorId,
      categoryId,
      publishedAt,
      tags: tags?.length
        ? {
            create: tags.map((tagId) => ({ tagId })),
          }
        : undefined,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      category: true,
      tags: { include: { tag: true } },
    },
  });

  await createAuditLog(authorId, 'CREATE', 'Post', post.id, null, { title, status }, req);

  return { post };
}

export async function getPosts(query, user) {
  const { page, limit, sortBy, sortOrder, search, status, categoryId, tagId, authorId } = getPaginationParams(query);

  const where = {
    deletedAt: null,
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(status && { status }),
    ...(categoryId && { categoryId }),
    ...(tagId && { tags: { some: { tagId } } }),
    ...(authorId && { authorId }),
  };

  if (!user || user.role === 'READER') {
    where.status = POST_STATUS.PUBLISHED;
  } else if (user.role === 'AUTHOR' && !authorId) {
    where.OR = [
      { status: POST_STATUS.PUBLISHED },
      { authorId: user.id },
    ];
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        category: true,
        tags: { include: { tag: true } },
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return {
    posts,
    meta: buildPaginationMeta(page, limit, total),
  };
}

export async function getPostById(id, user) {
  const post = await prisma.post.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(user?.role === 'READER' ? { status: POST_STATUS.PUBLISHED } : {}),
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      category: true,
      tags: { include: { tag: true } },
      _count: { select: { comments: true, likes: true, bookmarks: true } },
    },
  });

  if (!post) {
    throw new NotFoundError('Post');
  }

  return { post };
}

export async function getPostBySlug(slug, user) {
  const post = await prisma.post.findFirst({
    where: {
      slug,
      deletedAt: null,
      ...(user?.role === 'READER' ? { status: POST_STATUS.PUBLISHED } : {}),
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      category: true,
      tags: { include: { tag: true } },
      _count: { select: { comments: true, likes: true, bookmarks: true } },
    },
  });

  if (!post) {
    throw new NotFoundError('Post');
  }

  return { post };
}

export async function updatePost(id, authorId, data, req, user) {
  const post = await prisma.post.findUnique({
    where: { id },
  });

  if (!post || post.deletedAt) {
    throw new NotFoundError('Post');
  }

  const isOwner = post.authorId === authorId;
  const isAdmin = user?.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new AuthorizationError('You can only update your own posts');
  }

  const { title, excerpt, content, status, featuredImage, categoryId, tags } = data;
  const updateData = {};

  if (title !== undefined) {
    updateData.title = title;
    const baseSlug = generateSlug(title);
    updateData.slug = await generateUniqueSlug(baseSlug, slugExists);
  }
  if (excerpt !== undefined) updateData.excerpt = excerpt;
  if (content !== undefined) updateData.content = content;
  if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
  if (categoryId !== undefined) updateData.categoryId = categoryId;

  if (status !== undefined && status !== post.status) {
    updateData.status = status;
    if (status === POST_STATUS.PUBLISHED && post.status !== POST_STATUS.PUBLISHED) {
      updateData.publishedAt = new Date();
    }
  }

  if (tags !== undefined) {
    await prisma.postTag.deleteMany({ where: { postId: id } });
    if (tags.length) {
      updateData.tags = {
        create: tags.map((tagId) => ({ tagId })),
      };
    }
  }

  const updatedPost = await prisma.post.update({
    where: { id },
    data: updateData,
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      category: true,
      tags: { include: { tag: true } },
    },
  });

  await createAuditLog(authorId, 'UPDATE', 'Post', id, { title: post.title, status: post.status }, updateData, req);

  return { post: updatedPost };
}

export async function deletePost(id, authorId, req, user) {
  const post = await prisma.post.findUnique({
    where: { id },
  });

  if (!post || post.deletedAt) {
    throw new NotFoundError('Post');
  }

  const isOwner = post.authorId === authorId;
  const isAdmin = user?.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new AuthorizationError('You can only delete your own posts');
  }

  await prisma.post.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog(authorId, 'DELETE', 'Post', id, { title: post.title }, null, req);

  return { message: 'Post deleted successfully' };
}

export async function getUserPosts(authorId, query, user) {
  const { page, limit, sortBy, sortOrder, search, status } = getPaginationParams(query);

  const where = {
    authorId,
    deletedAt: null,
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(status && { status }),
  };

  if (user?.role === 'READER' || (user?.role === 'AUTHOR' && user.id !== authorId)) {
    where.status = POST_STATUS.PUBLISHED;
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        category: true,
        tags: { include: { tag: true } },
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return {
    posts,
    meta: buildPaginationMeta(page, limit, total),
  };
}

export async function getRelatedPosts(postId, categoryId, tags, limit = 5) {
  const tagIds = tags.map((t) => t.tagId);

  const posts = await prisma.post.findMany({
    where: {
      id: { not: postId },
      deletedAt: null,
      status: POST_STATUS.PUBLISHED,
      OR: [
        { categoryId },
        { tags: { some: { tagId: { in: tagIds } } } },
      ],
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      category: true,
      tags: { include: { tag: true } },
    },
    take: limit,
    orderBy: { publishedAt: 'desc' },
  });

  return { posts };
}