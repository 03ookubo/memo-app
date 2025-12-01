/**
 * WebAuthn 登録オプション取得 API
 * POST /api/auth/webauthn/register/options
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateWebAuthnRegistrationOptions,
  hasRegisteredUser,
  verifyLinkCode,
} from "@/server/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, linkCode } = body as { name?: string; linkCode?: string };

    // ユーザーが既に登録されているかチェック
    const hasUser = await hasRegisteredUser();

    let userId: string;
    let userName: string | undefined = name;

    if (hasUser) {
      // 既にユーザーが存在する場合、リンクコードが必要
      if (!linkCode) {
        return NextResponse.json(
          {
            error:
              "ユーザーは既に登録されています。デバイス追加にはリンクコードが必要です。",
          },
          { status: 400 }
        );
      }

      // リンクコードを検証
      const verification = await verifyLinkCode(linkCode);
      if (!verification.valid || !verification.userId) {
        return NextResponse.json(
          { error: verification.error || "無効なリンクコードです" },
          { status: 400 }
        );
      }

      userId = verification.userId;

      // 既存ユーザーの名前を取得
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      userName = existingUser?.name || undefined;
    } else {
      // 最初のユーザーを作成
      const newUser = await prisma.user.create({
        data: {
          name: name || null,
        },
      });
      userId = newUser.id;
    }

    // 登録オプションを生成
    const { options, challenge } = await generateWebAuthnRegistrationOptions(
      userId,
      userName
    );

    return NextResponse.json({
      options,
      challenge,
      userId,
      isNewUser: !hasUser,
    });
  } catch (error) {
    console.error("WebAuthn registration options error:", error);
    return NextResponse.json(
      { error: "登録オプションの生成に失敗しました" },
      { status: 500 }
    );
  }
}
