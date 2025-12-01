/**
 * リンクコード生成 API
 * POST /api/auth/link-code/generate
 */

import { NextResponse } from "next/server";
import { generateLinkCode, requireAuth } from "@/server/auth";
import { ServiceError } from "@/server/services/types";

export async function POST() {
  try {
    // 認証チェック
    const user = await requireAuth();

    // リンクコードを生成
    const result = await generateLinkCode(user.id);

    return NextResponse.json({
      code: result.code,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Link code generation error:", error);

    if (error instanceof ServiceError) {
      const status =
        error.code === "PERMISSION_DENIED"
          ? 401
          : error.code === "INVALID_OPERATION"
          ? 429
          : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "リンクコードの生成に失敗しました" },
      { status: 500 }
    );
  }
}
