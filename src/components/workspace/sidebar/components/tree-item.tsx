"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeItemProps {
  icon: LucideIcon;
  label: string;
  level?: number;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  active?: boolean;
  className?: string;
}

/**
 * ツリーアイテム - フォルダ/ファイルのツリー表示
 * 最小単位コンポーネント：ドラッグ&ドロップの対象
 */
export function TreeItem({
  icon: Icon,
  label,
  level = 0,
  expandable,
  expanded,
  onToggle,
  active,
  className,
}: TreeItemProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[14px] font-normal transition-all duration-200",
        active
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        className
      )}
      style={{ paddingLeft: `${10 + level * 16}px` }}
    >
      {expandable ? (
        expanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-60" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-60" />
        )
      ) : (
        <span className="w-4" />
      )}
      <Icon className="h-[18px] w-[18px] flex-shrink-0" />
      <span className="flex-1 truncate text-left">{label}</span>
    </button>
  );
}
