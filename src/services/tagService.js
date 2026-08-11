import { prisma } from '../config/database.js';
import { generateSlug, generateUniqueSlug } from '../utils/slug.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';

function tagSlugExists(slug) {
  return prisma.tag.findUnique({ where: { slug } }).then((tag) => !!tag);
}

export async function createTag(data, req) {
  const { name } = data;
  const baseSlug = generateSlug(name);
  const slug = await generateUniqueSlug(baseSlug, tagSlugExists);

  const existing = await prisma.tag.findUnique({ where: { name } });
  if (existing) {
    throw new ConflictError('Tag already exists');
  }

  const tag = await prisma.tag.create({ data: { name, slug } });

  await createAuditLog(req.user?.id, 'CREATE', 'Tag', tag.id, null, { name, slug }, req);

  return { tag };
}

export async function getTags(query) {
  const { page, limit, search } = getPaginationParams(query);

  const where = {
    ...(search && { name: { contains: search, mode: 'insensitive' } }),
  };

  const [tags, total] = await Promise.all([
    prisma.tag.findMany({
      where,
      include: { _count: { select: { posts: true } } },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.tag.count({ where }),
  ]);

  return { tags, meta: buildPaginationMeta(page, limit, total) };
}

export async function getTagById(id) {
  const tag = await prisma.tag.findUnique({
    where: { id },
    include: { _count: { select: { posts: true } } },
  });

  if (!tag) {
    throw new NotFoundError('Tag');
  }

  return { tag };
}

export async function updateTag(id, data, req) {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    throw new NotFoundError('Tag');
  }

  const { name } = data;
  const updateData = {};

  if (name !== undefined && name !== tag.name) {
    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing) throw new ConflictError('Tag name already exists');
    updateData.name = name;
    updateData.slug = await generateUniqueSlug(generateSlug(name), tagSlugExists);
  }

  const updated = await prisma.tag.update({
    where: { id },
    data: updateData,
  });

  await createAuditLog(req.user?.id, 'UPDATE', 'Tag', id, { name: tag.name }, updateData, req);

  return { tag: updated };
}

export async function deleteTag(id, req) {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    throw new NotFoundError('Tag');
  }

  const postsCount = await prisma.postTag.count({ where: { tagId: id } });
  if (postsCount > 0) {
    throw new ConflictError('Cannot delete tag with posts');
  }

  await prisma.tag.delete({ where: { id } });

  await createAuditLog(req.user?.id, 'DELETE', 'Tag', id, { name: tag.name }, null, req);

  return { message: 'Tag deleted successfully' };
}