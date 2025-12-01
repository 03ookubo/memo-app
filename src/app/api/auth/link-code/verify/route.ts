/**
 * リンクコード検証 API
 * POST /api/auth/link-code/verify
 */

import { NextResponse } from "next/server";
import { verifyLinkCode } from "@/server/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body as { code: string };

    if (!code) {
      return NextResponse.json({ error: "コードが必要です" }, { status: 400 });
    }

    // リンクコードを検証
    const result = await verifyLinkCode(code);

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      userId: result.userId,
    });
  } catch (error) {
    console.error("Link code verification error:", error);
    return NextResponse.json(
      { error: "リンクコードの検証に失敗しました" },
      { status: 500 }
    );
  }
}
