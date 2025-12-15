/**
 * Notes API - コレクションエンドポイント
 * GET /api/notes - ノート一覧取得
 * POST /api/notes - ノート作成
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as NoteReadService from "@/server/services/notes/note.read.service";
import * as NoteWriteService from "@/server/services/notes/note.write.service";
import {
  createNoteSchema,
  listNotesQuerySchema,
} from "@/lib/validation/note-schemas";
import {
  successResponse,
  createdResponse,
  handleError,
} from "@/lib/api/response";

/**
 * GET /api/notes
 * ノート一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthUserId();

    // クエリパラメータをパース
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = listNotesQuerySchema.parse(searchParams);

    const input = {
      ownerId: userId,
      projectId: query.projectId,
      tagId: query.tagId,
      search: query.search,
      pagination: {
        page: query.page,
        limit: query.limit,
      },
    };

    // ステータスに応じて取得関数を切り替え
    let result;
    switch (query.status) {
      case "archived":
        result = await NoteReadService.listArchivedNotes(input);
        break;
      case "deleted":
        result = await NoteReadService.listDeletedNotes(input);
        break;
      default:
        result = await NoteReadService.listActiveNotes(input);
    }

    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/notes
 * 新規ノートを作成
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthUserId();
    const body = await request.json();
    const data = createNoteSchema.parse(body);

    const note = await NoteWriteService.createNote({
      ownerId: userId,
      title: data.title,
      bodyMarkdown: data.bodyMarkdown,
      projectId: data.projectId ?? undefined,
      parentId: data.parentId ?? undefined,
      sortIndex: data.sortIndex,
      tagIds: data.tagIds,
      task: data.task
        ? {
            dueAt: data.task.dueAt ? new Date(data.task.dueAt) : undefined,
            priority: data.task.priority ?? undefined,
          }
        : undefined,
    });

    return createdResponse(note);
  } catch (error) {
    return handleError(error);
  }
}
