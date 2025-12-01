/**
 * WebAuthn 認証オプション取得 API
 * POST /api/auth/webauthn/authenticate/options
 */

import { NextResponse } from "next/server";
import {
  generateWebAuthnAuthenticationOptions,
  hasRegisteredUser,
  getFirstUser,
} from "@/server/auth";

export async function POST() {
  try {
    // ユーザーが登録されているかチェック
    const hasUser = await hasRegisteredUser();

    if (!hasUser) {
      return NextResponse.json(
        { error: "ユーザーが登録されていません" },
        { status: 400 }
      );
    }

    // シングルユーザーモードなので、最初のユーザーの Credential を使用
    const user = await getFirstUser();
    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // 認証オプションを生成
    const { options, challenge } = await generateWebAuthnAuthenticationOptions(
      user.id
    );

    return NextResponse.json({
      options,
      challenge,
      userId: user.id,
    });
  } catch (error) {
    console.error("WebAuthn authentication options error:", error);
    return NextResponse.json(
      { error: "認証オプションの生成に失敗しました" },
      { status: 500 }
    );
  }
}
