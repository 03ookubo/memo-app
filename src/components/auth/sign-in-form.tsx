"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Loader2, AlertCircle, RefreshCw, Info } from "lucide-react";

interface SignInFormProps {
  isFirstUser: boolean;
}

type ErrorType = "network" | "webauthn" | "server" | "unknown";

interface ErrorState {
  type: ErrorType;
  message: string;
  detail?: string;
}

/**
 * エラータイプを判定
 */
function classifyError(err: unknown): ErrorState {
  if (err instanceof Error) {
    const message = err.message.toLowerCase();
    
    // WebAuthn 関連のエラー
    if (err.name === "NotAllowedError") {
      return {
        type: "webauthn",
        message: "パスキー認証がキャンセルされました",
        detail: "もう一度お試しください。ブラウザのパスキーダイアログで認証を完了してください。",
      };
    }
    if (err.name === "NotSupportedError") {
      return {
        type: "webauthn",
        message: "このブラウザはパスキーに対応していません",
        detail: "Chrome, Edge, Safari, Firefox の最新版をお使いください。",
      };
    }
    if (message.includes("publickey-credentials")) {
      return {
        type: "webauthn",
        message: "パスキー機能が制限されています",
        detail: "VS Code 内蔵ブラウザではなく、通常のブラウザ（Chrome等）で http://localhost:3000 にアクセスしてください。",
      };
    }
    
    // ネットワークエラー
    if (message.includes("fetch") || message.includes("network")) {
      return {
        type: "network",
        message: "ネットワークエラー",
        detail: "インターネット接続を確認してください。",
      };
    }
    
    // サーバーエラー
    return {
      type: "server",
      message: err.message,
    };
  }
  
  return {
    type: "unknown",
    message: "予期しないエラーが発生しました",
  };
}

/**
 * サインインフォーム
 * WebAuthn（パスキー）による認証
 */
export function SignInForm({ isFirstUser }: SignInFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isFirstUser) {
        // 初回登録: WebAuthn Registration
        const response = await fetch("/api/auth/webauthn/register/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "登録オプションの取得に失敗しました");
        }

        const data = await response.json();
        const { options, userId } = data;

        // @simplewebauthn/browser を動的インポート
        const { startRegistration } = await import("@simplewebauthn/browser");
        const credential = await startRegistration(options);

        // 認証情報を送信（userId を含める）
        const verifyResponse = await fetch("/api/auth/webauthn/register/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, credential }),
        });

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "登録の検証に失敗しました");
        }

        // 成功したらワークスペースへ
        window.location.href = "/workspace";
      } else {
        // ログイン: WebAuthn Authentication
        const response = await fetch("/api/auth/webauthn/authenticate/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "認証オプションの取得に失敗しました");
        }

        const data = await response.json();
        const { options, userId } = data;

        const { startAuthentication } = await import("@simplewebauthn/browser");
        const credential = await startAuthentication(options);

        // 認証情報を送信（userId を含める）
        const verifyResponse = await fetch("/api/auth/webauthn/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, credential }),
        });

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "認証に失敗しました");
        }

        // 成功したらワークスペースへ
        window.location.href = "/workspace";
      }
    } catch (err) {
      console.error("認証エラー:", err);
      setError(classifyError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* メインボタン */}
      <Button
        onClick={handleSignIn}
        disabled={isLoading}
        className="w-full h-11 rounded-lg text-[14px] shadow-md transition-smooth hover:shadow-lg"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />
            処理中...
          </>
        ) : (
          <>
            <KeyRound className="mr-2 h-[18px] w-[18px]" />
            {isFirstUser ? "パスキーで登録" : "パスキーでログイン"}
          </>
        )}
      </Button>

      {/* エラー表示 */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-[14px] w-[14px]" />
              {error.message}
            </CardTitle>
          </CardHeader>
          {error.detail && (
            <CardContent className="pt-0">
              <CardDescription className="text-[11px] text-destructive/80">
                {error.detail}
              </CardDescription>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2 rounded-lg text-[12px]"
                onClick={() => setError(null)}
              >
                <RefreshCw className="h-[13px] w-[13px]" />
                もう一度試す
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* 注意事項（初回登録時） */}
      {isFirstUser && !error && (
        <Card className="bg-accent/30 border-border/50">
          <CardContent className="pt-4">
            <div className="flex gap-3 text-[13px]">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Info className="h-[14px] w-[14px] text-primary" />
              </div>
              <div>
                <p className="font-medium mb-1">パスキーについて</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  パスキーは、パスワードの代わりに指紋認証やFace ID、
                  PINなどを使用する安全な認証方法です。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* デバイス追加リンク（ログイン時） */}
      {!isFirstUser && !error && (
        <p className="text-[11px] text-muted-foreground text-center">
          別のデバイスからアクセスする場合は、
          <a href="/link-device" className="text-primary hover:underline transition-smooth">
            デバイス追加
          </a>
          をご利用ください
        </p>
      )}
    </div>
  );
}
