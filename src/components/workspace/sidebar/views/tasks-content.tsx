"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskItem } from "../components";
import { EmptyState } from "@/components/common";

type FilterType = "all" | "today" | "week";

const filterLabels: Record<FilterType, string> = {
  all: "すべて",
  today: "今日",
  week: "今週",
};

/**
 * タスクコンテンツ - タスク一覧の表示
 */
export function TasksContent() {
  const [filter, setFilter] = useState<FilterType>("all");

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex rounded-xl bg-accent/40 p-1">
        {(Object.keys(filterLabels) as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-[14px] transition-all duration-200",
              filter === f
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-1">
        <TaskItem title="プロジェクト計画を作成" done />
        <TaskItem title="ドキュメントのレビュー" priority="high" />
        <TaskItem title="ミーティング準備" priority="medium" dueDate="今日" />
        <TaskItem title="資料の更新" />
      </div>

      <EmptyState
        icon={CheckCircle2}
        title={`ノート内の「- [ ]」が\nタスクとして表示されます`}
      />
    </div>
  );
}
