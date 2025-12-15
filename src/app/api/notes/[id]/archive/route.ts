/**
 * Notes Archive API
 * POST /api/notes/[id]/archive - アーカイブ/アーカイブ解除
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as NoteArchiveService from "@/server/services/notes/note.archive.service";
import { archiveNoteSchema } from "@/lib/validation/note-schemas";
import { successResponse, handleError } from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/notes/[id]/archive
 * ノートをアーカイブ/アーカイブ解除
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuthUserId();
    const { id } = await params;
    const body = await request.json();
    const { action } = archiveNoteSchema.parse(body);

    let note;
    if (action === "archive") {
      note = await NoteArchiveService.archiveNote(id, userId);
    } else {
      note = await NoteArchiveService.unarchiveNote(id, userId);
    }

    return successResponse(note);
  } catch (error) {
    return handleError(error);
  }
}
