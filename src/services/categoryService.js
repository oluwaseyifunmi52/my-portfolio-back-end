import { prisma } from '../config/database.js';
import { generateSlug, generateUniqueSlug } from '../utils/slug.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';

function categorySlugExists(slug) {
  return prisma.category.findUnique({ where: { slug } }).then((cat) => !!cat);
}

export async function createCategory(data, req) {
  const { name, description } = data;
  const baseSlug = generateSlug(name);
  const slug = await generateUniqueSlug(baseSlug, categorySlugExists);

  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) {
    throw new ConflictError('Category already exists');
  }

  const category = await prisma.category.create({
    data: { name, slug, description },
  });

  await createAuditLog(req.user?.id, 'CREATE', 'Category', category.id, null, { name, slug }, req);

  return { category };
}

export async function getCategories(query) {
  const { page, limit, search } = getPaginationParams(query);

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      include: { _count: { select: { posts: true } } },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.category.count({ where }),
  ]);

  return { categories, meta: buildPaginationMeta(page, limit, total) };
}

export async function getCategoryById(id) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { posts: true } } },
  });

  if (!category) {
    throw new NotFoundError('Category');
  }

  return { category };
}

export async function updateCategory(id, data, req) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new NotFoundError('Category');
  }

  const { name, description } = data;
  const updateData = {};

  if (name !== undefined && name !== category.name) {
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) throw new ConflictError('Category name already exists');
    updateData.name = name;
    updateData.slug = await generateUniqueSlug(generateSlug(name), categorySlugExists);
  }
  if (description !== undefined) updateData.description = description;

  const updated = await prisma.category.update({
    where: { id },
    data: updateData,
  });

  await createAuditLog(req.user?.id, 'UPDATE', 'Category', id, { name: category.name }, updateData, req);

  return { category: updated };
}

export async function deleteCategory(id, req) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new NotFoundError('Category');
  }

  const postsCount = await prisma.post.count({ where: { categoryId: id } });
  if (postsCount > 0) {
    throw new ConflictError('Cannot delete category with posts');
  }

  await prisma.category.delete({ where: { id } });

  await createAuditLog(req.user?.id, 'DELETE', 'Category', id, { name: category.name }, null, req);

  return { message: 'Category deleted successfully' };
}