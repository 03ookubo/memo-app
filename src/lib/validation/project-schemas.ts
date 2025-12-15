/**
 * Project API バリデーションスキーマ
 */

import { z } from "zod";

/**
 * プロジェクト作成リクエスト
 */
export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  emoji: z.string().max(10).optional(),
  sortIndex: z.number().int().optional(),
});

export type CreateProjectRequest = z.infer<typeof createProjectSchema>;

/**
 * プロジェクト更新リクエスト
 */
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  emoji: z.string().max(10).optional().nullable(),
  sortIndex: z.number().int().optional(),
});

export type UpdateProjectRequest = z.infer<typeof updateProjectSchema>;

/**
 * プロジェクト一覧クエリパラメータ
 */
export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["active", "archived"]).default("active"),
});

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

/**
 * アーカイブ操作リクエスト
 */
export const archiveProjectSchema = z.object({
  action: z.enum(["archive", "unarchive"]),
});

export type ArchiveProjectRequest = z.infer<typeof archiveProjectSchema>;

/**
 * 削除操作クエリパラメータ
 */
export const deleteProjectSchema = z.object({
  permanent: z.coerce.boolean().default(false),
});

export type DeleteProjectRequest = z.infer<typeof deleteProjectSchema>;
