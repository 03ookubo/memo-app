/**
 * Integrations API - プロバイダー別エンドポイント
 * GET /api/integrations/[provider] - 特定プロバイダーの連携情報取得
 * DELETE /api/integrations/[provider] - 連携解除
 */

import { NextRequest } from "next/server";
import { requireAuthUserId } from "@/server/auth/session";
import * as IntegrationService from "@/server/services/integrations/integration.service";
import {
  successResponse,
  noContentResponse,
  handleError,
} from "@/lib/api/response";

interface RouteParams {
  params: Promise<{ provider: string }>;
}

/**
 * GET /api/integrations/[provider]
 * 特定プロバイダーの連携情報を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuthUserId();
    const { provider } = await params;

    const integration = await IntegrationService.getIntegration(
      userId,
      provider
    );

    if (!integration) {
      return successResponse(null);
    }

    return successResponse(integration);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/integrations/[provider]
 * 連携を解除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuthUserId();
    const { provider } = await params;

    await IntegrationService.removeIntegration(userId, provider);

    return noContentResponse();
  } catch (error) {
    return handleError(error);
  }
}
