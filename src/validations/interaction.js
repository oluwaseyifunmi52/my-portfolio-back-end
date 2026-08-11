import { z } from 'zod';

export const toggleLikeSchema = z.object({
  params: z.object({
    postId: z.string().cuid('Invalid post ID'),
  }),
});

export const toggleBookmarkSchema = z.object({
  params: z.object({
    postId: z.string().cuid('Invalid post ID'),
  }),
});

export const getUserLikesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export const getUserBookmarksSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});