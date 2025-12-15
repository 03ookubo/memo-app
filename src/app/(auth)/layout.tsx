import type { ReactNode } from "react";

/**
 * 認証グループレイアウト
 * サインイン・デバイス追加など未認証でアクセス可能なページ用
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* 左側 - ブランディングエリア（デスクトップのみ） */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-between bg-gradient-to-br from-primary/5 via-primary/10 to-accent/20 p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <span className="text-[14px] font-bold">M</span>
            </div>
            <span className="text-[18px] font-semibold tracking-tight">Memo App</span>
          </div>
        </div>
        <div className="space-y-4">
          <blockquote className="text-[16px] font-medium leading-relaxed">
            &ldquo;シンプルで美しいノートアプリ。<br />
            アイデアを整理し、タスクを管理し、<br />
            日々の生産性を高めましょう。&rdquo;
          </blockquote>
          <p className="text-[13px] text-muted-foreground">
            — あなたの創造性を支えるツール
          </p>
        </div>
        <div className="text-[11px] text-muted-foreground">
          © 2024 Memo App. All rights reserved.
        </div>
      </div>

      {/* 右側 - 認証フォームエリア */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* モバイルロゴ */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <span className="text-[14px] font-bold">M</span>
            </div>
            <span className="text-[18px] font-semibold tracking-tight">Memo App</span>
          </div>

          {/* カード */}
          <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-sm">
            {children}
          </div>

          {/* フッター */}
          <p className="mt-6 text-center text-[11px] text-muted-foreground lg:hidden">
            © 2024 Memo App. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
