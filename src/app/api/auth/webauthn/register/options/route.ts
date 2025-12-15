/**
 * WebAuthn 登録オプション取得 API
 * POST /api/auth/webauthn/register/options
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateWebAuthnRegistrationOptions,
  hasRegisteredCredential,
  verifyLinkCode,
} from "@/server/auth";

export async function POST(request: Request) {
  try {
    // ボディが空の場合も考慮
    let body: { name?: string; linkCode?: string } = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // JSONパースエラーは無視（空ボディの場合）
    }
    const { name, linkCode } = body;

    // パスキーが既に登録されているかチェック（ユーザーではなくCredentialで判定）
    const hasCredential = await hasRegisteredCredential();

    let userId: string;
    let userName: string | undefined = name;

    if (hasCredential) {
      // 既にパスキーが存在する場合、リンクコードが必要（デバイス追加）
      if (!linkCode) {
        return NextResponse.json(
          {
            error:
              "パスキーは既に登録されています。デバイス追加にはリンクコードが必要です。",
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
      // パスキーがない場合：既存ユーザーを探すか、新規作成
      const existingUser = await prisma.user.findFirst();
      
      if (existingUser) {
        // ユーザーは存在するがパスキーがない → そのユーザーにパスキーを登録
        userId = existingUser.id;
        userName = existingUser.name || undefined;
      } else {
        // 完全に新規：ユーザーを作成
        const newUser = await prisma.user.create({
          data: {
            name: name || null,
          },
        });
        userId = newUser.id;
      }
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
      isNewUser: !hasCredential,
    });
  } catch (error) {
    console.error("WebAuthn registration options error:", error);
    return NextResponse.json(
      { error: "登録オプションの生成に失敗しました" },
      { status: 500 }
    );
  }
}
