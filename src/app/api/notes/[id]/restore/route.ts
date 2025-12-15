/**
 * Notes Restore API
 * POST /api/notes/[id]/restore - ゴミ箱から復元
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as NoteDeleteService from "@/server/services/notes/note.delete.service";
import { successResponse, handleError } from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/notes/[id]/restore
 * ゴミ箱からノートを復元
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuthUserId();
    const { id } = await params;

    const note = await NoteDeleteService.restoreNote(id, userId);

    return successResponse(note);
  } catch (error) {
    return handleError(error);
  }
}
