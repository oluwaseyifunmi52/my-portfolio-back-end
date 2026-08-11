import { z } from 'zod';
import { COMMENT_STATUS } from '../config/constants.js';

export const createCommentSchema = z.object({
  params: z.object({
    postId: z.string().cuid('Invalid post ID'),
  }),
  body: z.object({
    content: z.string().min(3, 'Comment must be at least 3 characters').max(5000).trim(),
    parentId: z.string().cuid('Invalid parent comment ID').optional(),
  }),
});

export const updateCommentSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid comment ID'),
  }),
  body: z.object({
    content: z.string().min(3, 'Comment must be at least 3 characters').max(5000).trim(),
  }),
});

export const getCommentsSchema = z.object({
  params: z.object({
    postId: z.string().cuid('Invalid post ID'),
  }),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.nativeEnum(COMMENT_STATUS).optional(),
    parentId: z.string().cuid('Invalid parent comment ID').optional().nullable(),
  }),
});

export const moderateCommentSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid comment ID'),
  }),
  body: z.object({
    status: z.nativeEnum(COMMENT_STATUS),
  }),
});

export const deleteCommentSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid comment ID'),
  }),
});