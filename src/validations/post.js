import { z } from 'zod';
import { POST_STATUS } from '../config/constants.js';

export const createPostSchema = z.object({
  body: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(200).trim(),
    excerpt: z.string().max(500, 'Excerpt must be at most 500 characters').optional(),
    content: z.string().min(50, 'Content must be at least 50 characters'),
    status: z.nativeEnum(POST_STATUS).default(POST_STATUS.DRAFT),
    featuredImage: z.string().url('Invalid image URL').optional().nullable(),
    categoryId: z.string().cuid('Invalid category ID').optional().nullable(),
    tags: z.array(z.string().cuid('Invalid tag ID')).optional(),
  }),
});

export const updatePostSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid post ID'),
  }),
  body: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(200).trim().optional(),
    excerpt: z.string().max(500, 'Excerpt must be at most 500 characters').optional().nullable(),
    content: z.string().min(50, 'Content must be at least 50 characters').optional(),
    status: z.nativeEnum(POST_STATUS).optional(),
    featuredImage: z.string().url('Invalid image URL').optional().nullable(),
    categoryId: z.string().cuid('Invalid category ID').optional().nullable(),
    tags: z.array(z.string().cuid('Invalid tag ID')).optional(),
  }),
});

export const getPostsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.enum(['createdAt', 'updatedAt', 'publishedAt', 'title']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
    status: z.nativeEnum(POST_STATUS).optional(),
    categoryId: z.string().cuid('Invalid category ID').optional(),
    tagId: z.string().cuid('Invalid tag ID').optional(),
    authorId: z.string().cuid('Invalid author ID').optional(),
  }),
});

export const getPostBySlugSchema = z.object({
  params: z.object({
    slug: z.string().min(1, 'Slug is required'),
  }),
});

export const getPostByIdSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid post ID'),
  }),
});

export const deletePostSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid post ID'),
  }),
});