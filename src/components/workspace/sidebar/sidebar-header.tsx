"use client";

import { Plus, MoreHorizontal } from "lucide-react";
import { IconButton } from "@/components/common";
import type { ViewType } from "../../workspace-shell";

interface SidebarHeaderProps {
  activeView: ViewType;
}

const VIEW_TITLES: Record<ViewType, string> = {
  explorer: "プロジェクト",
  search: "検索",
  tasks: "タスク",
  calendar: "カレンダー",
};

/**
 * サイドバーヘッダー - タイトルとアクションボタン
 */
export function SidebarHeader({ activeView }: SidebarHeaderProps) {
  return (
    <div className="flex h-14 items-center justify-between px-4 border-b border-border/40">
      <span className="text-[15px] font-semibold text-foreground">
        {VIEW_TITLES[activeView]}
      </span>
      <div className="flex items-center gap-1">
        {activeView === "explorer" && (
          <IconButton icon={Plus} tooltip="新規作成" size="lg" />
        )}
        <IconButton icon={MoreHorizontal} tooltip="オプション" size="lg" />
      </div>
    </div>
  );
}
