"use client";

import { Search, Filter, SortAsc } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState, IconButton } from "@/components/common";

/**
 * 検索コンテンツ - ノートの検索機能
 */
export function SearchContent() {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground/50" />
        <Input
          placeholder="ノートを検索..."
          className="h-10 pl-10 text-[15px] bg-accent/30 border-0 rounded-xl focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="flex gap-2">
        <button className="flex items-center gap-2 rounded-xl bg-accent/40 px-3 py-2 text-[14px] text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200">
          <Filter className="h-4 w-4" />
          フィルター
        </button>
        <button className="flex items-center gap-2 rounded-xl bg-accent/40 px-3 py-2 text-[14px] text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200">
          <SortAsc className="h-4 w-4" />
          並び替え
        </button>
      </div>

      <EmptyState
        icon={Search}
        title="キーワードを入力"
        description="タイトル、本文、タグで検索"
      />
    </div>
  );
}
