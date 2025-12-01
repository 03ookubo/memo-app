/**
 * 認証状態確認 API
 * GET /api/auth/status
 */

import { NextResponse } from "next/server";
import { getSession, hasRegisteredUser } from "@/server/auth";

export async function GET() {
  try {
    const [session, hasUser] = await Promise.all([
      getSession(),
      hasRegisteredUser(),
    ]);

    return NextResponse.json({
      authenticated: !!session?.user,
      hasUser,
      user: session?.user
        ? {
            id: session.user.id,
            name: session.user.name,
          }
        : null,
    });
  } catch (error) {
    console.error("Auth status error:", error);
    return NextResponse.json(
      { error: "認証状態の取得に失敗しました" },
      { status: 500 }
    );
  }
}
