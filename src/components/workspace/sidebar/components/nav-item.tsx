"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * ナビゲーションアイテム - サイドバーのナビゲーションリンク
 * 最小単位コンポーネント：ドラッグ&ドロップの対象
 */
export function NavItem({
  icon: Icon,
  label,
  count,
  active,
  onClick,
  className,
}: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-normal transition-all duration-200",
        active
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        className
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1 truncate text-left">{label}</span>
      {count !== undefined && (
        <span className="text-[13px] text-muted-foreground/50 tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}
