import { z } from 'zod';

export const createTagSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(30).trim(),
  }),
});

export const updateTagSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid tag ID'),
  }),
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(30).trim().optional(),
  }),
});

export const getTagSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid tag ID'),
  }),
});

export const getTagsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
  }),
});

export const deleteTagSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid tag ID'),
  }),
});