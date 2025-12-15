/**
 * Task API バリデーションスキーマ
 */

import { z } from "zod";

/**
 * タスク更新リクエスト
 */
export const updateTaskSchema = z.object({
  dueAt: z.string().datetime().optional().nullable(),
  priority: z.number().int().min(0).max(5).optional().nullable(),
});

export type UpdateTaskRequest = z.infer<typeof updateTaskSchema>;

/**
 * タスク一覧クエリパラメータ
 */
export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["all", "completed", "uncompleted"]).default("all"),
});

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

/**
 * 完了操作リクエスト
 */
export const completeTaskSchema = z.object({
  action: z.enum(["complete", "uncomplete", "toggle"]),
});

export type CompleteTaskRequest = z.infer<typeof completeTaskSchema>;
