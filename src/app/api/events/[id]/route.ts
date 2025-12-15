/**
 * Events API - 個別エンドポイント
 * GET /api/events/[id] - イベント詳細取得
 * PATCH /api/events/[id] - イベント更新
 * DELETE /api/events/[id] - イベント削除
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as EventService from "@/server/services/events/event.service";
import { updateEventSchema } from "@/lib/validation/event-schemas";
import {
  successResponse,
  noContentResponse,
  handleError,
} from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/[id]
 * イベント詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuthUserId();
    const { id } = await params;

    const event = await EventService.getEventById(id, userId, {
      note: true,
    });

    return successResponse(event);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/events/[id]
 * イベントを更新
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuthUserId();
    const { id } = await params;
    const body = await request.json();
    const data = updateEventSchema.parse(body);

    const event = await EventService.updateEvent(id, userId, {
      startAt: data.startAt,
      endAt: data.endAt,
      isAllDay: data.isAllDay,
      location: data.location,
      recurrenceRule: data.recurrenceRule,
      metadata: data.metadata,
    });

    return successResponse(event);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/events/[id]
 * イベントを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuthUserId();
    const { id } = await params;

    await EventService.deleteEvent(id, userId);

    return noContentResponse();
  } catch (error) {
    return handleError(error);
  }
}
