/**
 * Note API バリデーションスキーマ
 */

import { z } from "zod";

/**
 * ノート作成リクエスト
 */
export const createNoteSchema = z.object({
  title: z.string().max(500).optional(),
  bodyMarkdown: z.string().optional(),
  projectId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  sortIndex: z.number().int().optional(),
  tagIds: z.array(z.string()).optional(),
  isEncrypted: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  task: z
    .object({
      dueAt: z.string().datetime().optional().nullable(),
      priority: z.number().int().min(0).max(5).optional().nullable(),
      recurrenceRule: z.string().optional().nullable(),
      metadata: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
  event: z
    .object({
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      isAllDay: z.boolean().optional(),
      location: z.string().optional().nullable(),
      recurrenceRule: z.string().optional().nullable(),
      metadata: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
});

export type CreateNoteRequest = z.infer<typeof createNoteSchema>;

/**
 * ノート更新リクエスト
 */
export const updateNoteSchema = z.object({
  title: z.string().max(500).optional().nullable(),
  bodyMarkdown: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  sortIndex: z.number().int().optional(),
  tagIds: z.array(z.string()).optional(),
  isEncrypted: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  task: z
    .object({
      dueAt: z.string().datetime().optional().nullable(),
      priority: z.number().int().min(0).max(5).optional().nullable(),
      completedAt: z.string().datetime().optional().nullable(),
      recurrenceRule: z.string().optional().nullable(),
      metadata: z.record(z.string(), z.any()).optional(),
    })
    .optional()
    .nullable(),
  event: z
    .object({
      startAt: z.string().datetime().optional(),
      endAt: z.string().datetime().optional(),
      isAllDay: z.boolean().optional(),
      location: z.string().optional().nullable(),
      recurrenceRule: z.string().optional().nullable(),
      metadata: z.record(z.string(), z.any()).optional(),
    })
    .optional()
    .nullable(),
});

export type UpdateNoteRequest = z.infer<typeof updateNoteSchema>;

/**
 * ノート一覧クエリパラメータ
 */
export const listNotesQuerySchema = z.object({
  projectId: z.string().optional(),
  tagId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["active", "archived", "deleted"]).default("active"),
});

export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;

/**
 * アーカイブ操作リクエスト
 */
export const archiveNoteSchema = z.object({
  action: z.enum(["archive", "unarchive"]),
});

export type ArchiveNoteRequest = z.infer<typeof archiveNoteSchema>;

/**
 * 削除操作リクエスト
 */
export const deleteNoteSchema = z.object({
  permanent: z
    .string()
    .default("false")
    .transform((val) => val === "true"),
});

export type DeleteNoteRequest = z.infer<typeof deleteNoteSchema>;

/**
 * 復元操作リクエスト
 */
export const restoreNoteSchema = z.object({
  action: z.literal("restore"),
});

export type RestoreNoteRequest = z.infer<typeof restoreNoteSchema>;
