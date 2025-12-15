/**
 * Attachment API バリデーションスキーマ
 */

import { z } from "zod";

/**
 * 添付ファイルレイアウト
 */
const attachmentLayoutSchema = z.object({
  insertAfterLine: z.number().int().min(0).optional(),
  width: z.string().max(20).optional(),
  height: z.string().max(20).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  caption: z.string().max(500).optional(),
  alt: z.string().max(500).optional(),
});

/**
 * 添付ファイル作成リクエスト（URLからの埋め込み用）
 */
export const createAttachmentSchema = z.object({
  noteId: z.string(),
  url: z.string().url(),
  kind: z.enum(["IMAGE", "FILE", "LINK"]),
  name: z.string().max(255).optional(),
  mimeType: z.string().max(100).optional(),
  position: z.number().int().optional(),
  layout: attachmentLayoutSchema.optional(),
});

export type CreateAttachmentRequest = z.infer<typeof createAttachmentSchema>;

/**
 * 添付ファイル更新リクエスト
 */
export const updateAttachmentSchema = z.object({
  name: z.string().max(255).optional().nullable(),
  position: z.number().int().optional(),
  layout: attachmentLayoutSchema.optional(),
});

export type UpdateAttachmentRequest = z.infer<typeof updateAttachmentSchema>;

/**
 * 添付ファイル一覧クエリパラメータ
 */
export const listAttachmentsQuerySchema = z.object({
  noteId: z.string(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type ListAttachmentsQuery = z.infer<typeof listAttachmentsQuerySchema>;

/**
 * 並び順更新リクエスト
 */
export const reorderAttachmentsSchema = z.object({
  noteId: z.string(),
  orders: z
    .array(
      z.object({
        id: z.string(),
        position: z.number().int().min(0),
      })
    )
    .min(1),
});

export type ReorderAttachmentsRequest = z.infer<
  typeof reorderAttachmentsSchema
>;
