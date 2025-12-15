/**
 * Tags API - 個別エンドポイント
 * GET /api/tags/[id] - タグ詳細取得
 * PATCH /api/tags/[id] - タグ更新
 * DELETE /api/tags/[id] - タグ削除
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as TagService from "@/server/services/tags/tag.service";
import { updateTagSchema } from "@/lib/validation/tag-schemas";
import {
  successResponse,
  noContentResponse,
  handleError,
} from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tags/[id]
 * タグ詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuthUserId();
    const { id } = await params;

    const tag = await TagService.getTagById(id);

    return successResponse(tag);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/tags/[id]
 * タグを更新（ユーザータグのみ）
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuthUserId();
    const { id } = await params;
    const body = await request.json();
    const data = updateTagSchema.parse(body);

    const tag = await TagService.updateTag(id, {
      name: data.name,
      color: data.color,
      description: data.description,
    });

    return successResponse(tag);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/tags/[id]
 * タグを削除（ユーザータグのみ）
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuthUserId();
    const { id } = await params;

    await TagService.deleteTag(id);

    return noContentResponse();
  } catch (error) {
    return handleError(error);
  }
}
