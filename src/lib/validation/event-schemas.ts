import { z } from "zod";

/**
 * Event バリデーションスキーマ
 */

// Event 作成スキーマ
export const createEventSchema = z.object({
  noteId: z.string().cuid(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  isAllDay: z.boolean().optional().default(false),
  location: z.string().optional(),
  recurrenceRule: z.string().optional(), // iCal RRULE format
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

// Event 更新スキーマ
export const updateEventSchema = z.object({
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  isAllDay: z.boolean().optional(),
  location: z.string().optional(),
  recurrenceRule: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// Event 一覧取得クエリスキーマ
export const listEventsQuerySchema = z.object({
  noteId: z.string().cuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
