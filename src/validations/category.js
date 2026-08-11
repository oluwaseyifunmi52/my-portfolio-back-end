import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50).trim(),
    description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid category ID'),
  }),
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50).trim().optional(),
    description: z.string().max(500, 'Description must be at most 500 characters').optional().nullable(),
  }),
});

export const getCategorySchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid category ID'),
  }),
});

export const getCategoriesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
  }),
});

export const deleteCategorySchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid category ID'),
  }),
});