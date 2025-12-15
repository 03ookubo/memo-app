/**
 * Tasks API - 一覧エンドポイント
 * GET /api/tasks - タスク一覧取得
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as TaskService from "@/server/services/tasks/task.service";
import { listTasksQuerySchema } from "@/lib/validation/task-schemas";
import { successResponse, handleError } from "@/lib/api/response";

/**
 * GET /api/tasks
 * タスク一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthUserId();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = listTasksQuerySchema.parse(searchParams);

    const pagination = { page: query.page, limit: query.limit };

    let result;
    switch (query.status) {
      case "completed":
        result = await TaskService.listCompletedTasks(pagination);
        break;
      case "uncompleted":
        result = await TaskService.listUncompletedTasks(pagination);
        break;
      default:
        result = await TaskService.listTasks({ pagination });
        break;
    }

    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
