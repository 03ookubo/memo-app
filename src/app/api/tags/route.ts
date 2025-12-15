/**
 * Tags API - 一覧・作成エンドポイント
 * GET /api/tags - タグ一覧取得
 * POST /api/tags - タグ作成
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as TagService from "@/server/services/tags/tag.service";
import {
  createTagSchema,
  listTagsQuerySchema,
} from "@/lib/validation/tag-schemas";
import {
  successResponse,
  createdResponse,
  handleError,
} from "@/lib/api/response";

/**
 * GET /api/tags
 * タグ一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthUserId();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = listTagsQuerySchema.parse(searchParams);

    const pagination = { page: query.page, limit: query.limit };

    let result;
    switch (query.scope) {
      case "user":
        result = await TagService.listUserTags(userId, pagination);
        break;
      case "system":
        result = await TagService.listSystemTags(pagination);
        break;
      default:
        // all: ユーザータグとシステムタグの両方
        result = await TagService.listTags({
          ownerId: userId,
          pagination,
        });
        break;
    }

    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/tags
 * 新規タグを作成（ユーザータグ）
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthUserId();
    const body = await request.json();
    const data = createTagSchema.parse(body);

    const tag = await TagService.createTag({
      ownerId: userId,
      name: data.name,
      color: data.color,
      description: data.description,
    });

    return createdResponse(tag);
  } catch (error) {
    return handleError(error);
  }
}
