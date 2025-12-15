/**
 * Notes API - 個別エンドポイント
 * GET /api/notes/[id] - ノート詳細取得
 * PATCH /api/notes/[id] - ノート更新
 * DELETE /api/notes/[id] - ノート削除
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as NoteReadService from "@/server/services/notes/note.read.service";
import * as NoteWriteService from "@/server/services/notes/note.write.service";
import * as NoteDeleteService from "@/server/services/notes/note.delete.service";
import * as TaskService from "@/server/services/tasks/task.service";
import {
  updateNoteSchema,
  deleteNoteSchema,
} from "@/lib/validation/note-schemas";
import {
  successResponse,
  noContentResponse,
  handleError,
} from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/notes/[id]
 * ノート詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuthUserId();
    const { id } = await params;

    const note = await NoteReadService.getNoteById(id, userId);

    return successResponse(note);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/notes/[id]
 * ノートを更新
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuthUserId();
    const { id } = await params;
    const body = await request.json();
    const data = updateNoteSchema.parse(body);

    // ノートを更新
    await NoteWriteService.updateNote(id, userId, {
      title: data.title ?? undefined,
      bodyMarkdown: data.bodyMarkdown ?? undefined,
      projectId: data.projectId,
      parentId: data.parentId,
      sortIndex: data.sortIndex,
      tagIds: data.tagIds,
    });

    // タスクの更新/削除/作成が指定されている場合
    if (data.task !== undefined) {
      if (data.task === null) {
        // タスク削除
        await NoteWriteService.removeTaskFromNote(id, userId);
      } else {
        // 既存タスクがあるか確認
        const existingTask = await TaskService.getTaskByNoteId(id);
        if (existingTask) {
          // 既存タスクを更新
          await TaskService.updateTask(existingTask.id, {
            dueAt: data.task.dueAt
              ? new Date(data.task.dueAt)
              : data.task.dueAt === null
              ? null
              : undefined,
            priority: data.task.priority,
          });
          // completedAt の処理
          if (data.task.completedAt !== undefined) {
            if (data.task.completedAt && !existingTask.completedAt) {
              await TaskService.completeTask(existingTask.id);
            } else if (
              data.task.completedAt === null &&
              existingTask.completedAt
            ) {
              await TaskService.uncompleteTask(existingTask.id);
            }
          }
        } else {
          // 新規タスク作成
          await NoteWriteService.addTaskToNote(id, userId, {
            dueAt: data.task.dueAt ? new Date(data.task.dueAt) : undefined,
            priority: data.task.priority ?? undefined,
          });
        }
      }
    }

    // 最新の状態を再取得して返す
    const updatedNote = await NoteReadService.getNoteById(id, userId, {
      task: true,
    });

    return successResponse(updatedNote);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/notes/[id]
 * ノートを削除
 * - permanent=false（デフォルト）: ソフトデリート（ゴミ箱へ）
 * - permanent=true: 完全削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuthUserId();
    const { id } = await params;

    // クエリパラメータから permanent フラグを取得
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { permanent } = deleteNoteSchema.parse(searchParams);

    if (permanent) {
      await NoteDeleteService.hardDeleteNote(id, userId);
    } else {
      await NoteDeleteService.softDeleteNote(id, userId);
    }

    return noContentResponse();
  } catch (error) {
    return handleError(error);
  }
}
