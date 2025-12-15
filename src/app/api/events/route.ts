/**
 * Events API - コレクションエンドポイント
 * GET /api/events - イベント一覧取得
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as EventService from "@/server/services/events/event.service";
import { listEventsQuerySchema } from "@/lib/validation/event-schemas";
import { successResponse, handleError } from "@/lib/api/response";

/**
 * GET /api/events
 * イベント一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthUserId();

    // クエリパラメータをパース
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = listEventsQuerySchema.parse(searchParams);

    const events = await EventService.listEvents({
      ownerId: userId,
      from: query.startDate,
      to: query.endDate,
      include: { note: true },
    });

    return successResponse({
      data: events,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: events.length,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
