"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    icon?: LucideIcon;
    label: string;
    onClick?: () => void;
  };
  className?: string;
}

/**
 * 空状態表示 - コンテンツがない時の表示
 * 共通の最小単位コンポーネント
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border/50 p-5 text-center",
        className
      )}
    >
      <Icon className="mx-auto h-7 w-7 text-muted-foreground/30" />
      <p className="mt-3 text-[14px] text-muted-foreground/70 leading-relaxed whitespace-pre-line">
        {title}
      </p>
      {description && (
        <p className="mt-1.5 text-[13px] text-muted-foreground/50">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent/50 px-4 py-2 text-[14px] text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
