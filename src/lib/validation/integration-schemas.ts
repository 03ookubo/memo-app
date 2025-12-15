import { z } from "zod";

/**
 * Integration バリデーションスキーマ
 */

// Integration 作成・更新スキーマ
export const upsertIntegrationSchema = z.object({
  provider: z.string().min(1).max(50),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type UpsertIntegrationInput = z.infer<typeof upsertIntegrationSchema>;

// Integration 一覧取得クエリスキーマ
export const listIntegrationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type ListIntegrationsQuery = z.infer<typeof listIntegrationsQuerySchema>;
