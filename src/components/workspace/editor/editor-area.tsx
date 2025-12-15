"use client";

import {
  FileText,
  Plus,
  Sparkles,
  ArrowRight,
  BookOpen,
  Lightbulb,
  ListTodo,
  Calendar,
} from "lucide-react";

/**
 * エディタエリア - Dribbble Tab Design 2 スタイル
 */
export function EditorArea() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background p-8">
      <div className="w-full max-w-lg">
        {/* Welcome */}
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/50">
            <FileText className="h-7 w-7 text-primary/80" />
          </div>

          <h1 className="text-[18px] font-semibold tracking-tight">
            ようこそ
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground/70 leading-relaxed">
            ノートを選択するか、新しいノートを作成してください
          </p>

          {/* Quick actions */}
          <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <button className="flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 transition-all duration-200">
              <Plus className="h-4 w-4" />
              新規ノート
            </button>
            <button className="flex h-9 items-center gap-2 rounded-xl border border-border/40 px-4 text-[13px] text-muted-foreground/70 hover:bg-accent/40 hover:text-foreground transition-all duration-200">
              <Sparkles className="h-4 w-4" />
              テンプレート
            </button>
          </div>
        </div>

        {/* Quick start */}
        <div className="mt-10">
          <h2 className="mb-3 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
            クイックスタート
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <QuickStartCard
              icon={BookOpen}
              title="メモを取る"
              description="リッチテキストでノート作成"
              color="blue"
            />
            <QuickStartCard
              icon={ListTodo}
              title="タスク管理"
              description="[ ]でチェックリスト"
              color="green"
            />
            <QuickStartCard
              icon={Lightbulb}
              title="アイデア整理"
              description="プロジェクトで分類"
              color="yellow"
            />
            <QuickStartCard
              icon={Calendar}
              title="スケジュール"
              description="イベントを設定"
              color="purple"
            />
          </div>
        </div>

        {/* Recent notes */}
        <div className="mt-8">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
              最近のノート
            </h2>
            <button className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-foreground transition-all duration-200">
              すべて表示
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-2 rounded-xl border border-dashed border-border/30 p-4 text-center">
            <p className="text-[13px] text-muted-foreground/60 leading-relaxed">
              最近のノートがここに表示されます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStartCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  color: "blue" | "green" | "yellow" | "purple";
}) {
  const colorStyles = {
    blue: "hover:bg-blue-500/5 [&_svg]:text-blue-500",
    green: "hover:bg-green-500/5 [&_svg]:text-green-500",
    yellow: "hover:bg-yellow-500/5 [&_svg]:text-yellow-500",
    purple: "hover:bg-purple-500/5 [&_svg]:text-purple-500",
  };

  return (
    <button className={`flex items-start gap-3 rounded-xl border border-border/30 p-3 text-left transition-all duration-200 ${colorStyles[color]}`}>
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-accent/40">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/50">{description}</p>
      </div>
    </button>
  );
}
