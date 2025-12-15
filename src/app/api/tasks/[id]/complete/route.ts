/**
 * Tasks Complete API
 * POST /api/tasks/[id]/complete - タスク完了状態の操作
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as TaskService from "@/server/services/tasks/task.service";
import { completeTaskSchema } from "@/lib/validation/task-schemas";
import { successResponse, handleError } from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/tasks/[id]/complete
 * タスクの完了状態を操作
 * body: { action: "complete" | "uncomplete" | "toggle" }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuthUserId();
    const { id } = await params;
    const body = await request.json();
    const { action } = completeTaskSchema.parse(body);

    let task;
    switch (action) {
      case "complete":
        task = await TaskService.completeTask(id);
        break;
      case "uncomplete":
        task = await TaskService.uncompleteTask(id);
        break;
      case "toggle":
        task = await TaskService.toggleTaskCompletion(id);
        break;
    }

    return successResponse(task);
  } catch (error) {
    return handleError(error);
  }
}
