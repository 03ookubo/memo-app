import { hasRegisteredCredential } from "@/server/auth";
import { SignInForm } from "@/components/auth/sign-in-form";
import { KeyRound, Shield, Sparkles } from "lucide-react";

/**
 * サインインページ
 * - パスキーが0件 → 初回登録モード（Registration）
 * - パスキーがある → ログインモード（Authentication）
 */
export default async function SignInPage() {
  // パスキー（Credential）が登録されているかで判定
  // ユーザーが存在してもパスキー登録に失敗していれば登録モード
  const hasCredential = await hasRegisteredCredential();

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="space-y-3 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-inner">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-[22px] font-bold tracking-tight">
          {hasCredential ? "おかえりなさい" : "はじめましょう"}
        </h1>
        <p className="text-[13px] text-muted-foreground">
          {hasCredential
            ? "パスキーを使用してログインします"
            : "パスキーを使用してアカウントを作成します"}
        </p>
      </div>

      {/* フォーム */}
      <SignInForm isFirstUser={!hasCredential} />

      {/* 特徴（初回登録時のみ） */}
      {!hasCredential && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-3 rounded-lg bg-accent/30 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <Shield className="h-[18px] w-[18px] text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-[13px] font-medium">パスワード不要</p>
              <p className="text-[11px] text-muted-foreground">
                安全で使いやすい認証
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-accent/30 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
              <Sparkles className="h-[18px] w-[18px] text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-[13px] font-medium">シンプルなメモアプリ</p>
              <p className="text-[11px] text-muted-foreground">
                ノート、タスク、カレンダーを一元管理
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
