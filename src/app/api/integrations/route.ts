/**
 * Integrations API - コレクションエンドポイント
 * GET /api/integrations - 連携一覧取得
 * POST /api/integrations - 連携登録・更新
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as IntegrationService from "@/server/services/integrations/integration.service";
import {
  upsertIntegrationSchema,
  listIntegrationsQuerySchema,
} from "@/lib/validation/integration-schemas";
import {
  successResponse,
  createdResponse,
  handleError,
} from "@/lib/api/response";

/**
 * GET /api/integrations
 * 連携一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthUserId();

    // クエリパラメータをパース
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = listIntegrationsQuerySchema.parse(searchParams);

    const integrations = await IntegrationService.listIntegrations(userId);

    return successResponse({
      data: integrations,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: integrations.length,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/integrations
 * 連携を登録または更新
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthUserId();
    const body = await request.json();
    const data = upsertIntegrationSchema.parse(body);

    const integration = await IntegrationService.upsertIntegration({
      userId,
      provider: data.provider,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      metadata: data.metadata,
    });

    return createdResponse(integration);
  } catch (error) {
    return handleError(error);
  }
}
