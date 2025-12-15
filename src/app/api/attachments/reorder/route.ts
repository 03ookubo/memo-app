/**
 * Attachments Reorder API
 * POST /api/attachments/reorder - 添付ファイルの並び順更新
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as AttachmentService from "@/server/services/attachments/attachment.service";
import { reorderAttachmentsSchema } from "@/lib/validation/attachment-schemas";
import { successResponse, handleError } from "@/lib/api/response";

/**
 * POST /api/attachments/reorder
 * 添付ファイルの並び順を更新
 * body: { noteId: string, orders: Array<{ id: string, position: number }> }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuthUserId();
    const body = await request.json();
    const data = reorderAttachmentsSchema.parse(body);

    await AttachmentService.reorderAttachments(data.noteId, data.orders);

    // 更新後の一覧を返す
    const result = await AttachmentService.listAttachmentsForNote({
      noteId: data.noteId,
    });

    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
