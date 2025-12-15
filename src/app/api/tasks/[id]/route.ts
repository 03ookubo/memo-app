/**
 * Tasks API - 個別エンドポイント
 * GET /api/tasks/[id] - タスク詳細取得
 * PATCH /api/tasks/[id] - タスク更新
 * DELETE /api/tasks/[id] - タスク削除
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as TaskService from "@/server/services/tasks/task.service";
import { updateTaskSchema } from "@/lib/validation/task-schemas";
import {
  successResponse,
  noContentResponse,
  handleError,
} from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tasks/[id]
 * タスク詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuthUserId();
    const { id } = await params;

    const task = await TaskService.getTaskById(id);

    return successResponse(task);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/tasks/[id]
 * タスクを更新
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuthUserId();
    const { id } = await params;
    const body = await request.json();
    const data = updateTaskSchema.parse(body);

    const task = await TaskService.updateTask(id, {
      dueAt: data.dueAt
        ? new Date(data.dueAt)
        : data.dueAt === null
        ? null
        : undefined,
      priority: data.priority,
    });

    return successResponse(task);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/tasks/[id]
 * タスクを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuthUserId();
    const { id } = await params;

    await TaskService.deleteTask(id);

    return noContentResponse();
  } catch (error) {
    return handleError(error);
  }
}
