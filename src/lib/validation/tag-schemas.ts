/**
 * Tag API バリデーションスキーマ
 */

import { z } from "zod";

/**
 * タグ作成リクエスト
 */
export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "色はHEX形式（例: #FF5733）で指定してください"),
  description: z.string().max(500).optional(),
});

export type CreateTagRequest = z.infer<typeof createTagSchema>;

/**
 * タグ更新リクエスト
 */
export const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "色はHEX形式（例: #FF5733）で指定してください")
    .optional(),
  description: z.string().max(500).optional().nullable(),
});

export type UpdateTagRequest = z.infer<typeof updateTagSchema>;

/**
 * タグ一覧クエリパラメータ
 */
export const listTagsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  scope: z.enum(["user", "system", "all"]).default("all"),
});

export type ListTagsQuery = z.infer<typeof listTagsQuerySchema>;
