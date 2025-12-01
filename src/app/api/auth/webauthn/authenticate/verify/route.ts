/**
 * WebAuthn 認証検証 API
 * POST /api/auth/webauthn/authenticate/verify
 */

import { NextResponse } from "next/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { verifyWebAuthnAuthentication, signIn } from "@/server/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { credential } = body as {
      credential: AuthenticationResponseJSON;
    };

    if (!credential) {
      return NextResponse.json(
        { error: "credential が必要です" },
        { status: 400 }
      );
    }

    // 認証を検証
    const result = await verifyWebAuthnAuthentication(credential);

    if (!result.verified || !result.user) {
      return NextResponse.json(
        { error: result.error || "認証に失敗しました" },
        { status: 401 }
      );
    }

    // セッションを作成
    await signIn("webauthn", {
      userId: result.user.id,
      redirect: false,
    });

    return NextResponse.json({
      verified: true,
      user: {
        id: result.user.id,
        name: result.user.name,
      },
    });
  } catch (error) {
    console.error("WebAuthn authentication verification error:", error);
    return NextResponse.json(
      { error: "認証の検証に失敗しました" },
      { status: 500 }
    );
  }
}
