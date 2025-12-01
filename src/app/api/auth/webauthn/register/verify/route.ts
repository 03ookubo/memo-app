/**
 * WebAuthn 登録検証 API
 * POST /api/auth/webauthn/register/verify
 */

import { NextResponse } from "next/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import {
  verifyWebAuthnRegistration,
  markLinkCodeAsUsed,
  signIn,
} from "@/server/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, credential, linkCode } = body as {
      userId: string;
      credential: RegistrationResponseJSON;
      linkCode?: string;
    };

    if (!userId || !credential) {
      return NextResponse.json(
        { error: "userId と credential が必要です" },
        { status: 400 }
      );
    }

    // 登録を検証
    const result = await verifyWebAuthnRegistration(userId, credential);

    if (!result.verified) {
      return NextResponse.json(
        { error: result.error || "登録に失敗しました" },
        { status: 400 }
      );
    }

    // リンクコードを使用済みにマーク
    if (linkCode) {
      await markLinkCodeAsUsed(linkCode);
    }

    // セッションを作成
    await signIn("webauthn", {
      userId,
      redirect: false,
    });

    return NextResponse.json({
      verified: true,
      credentialId: result.credential?.id,
    });
  } catch (error) {
    console.error("WebAuthn registration verification error:", error);
    return NextResponse.json(
      { error: "登録の検証に失敗しました" },
      { status: 500 }
    );
  }
}
