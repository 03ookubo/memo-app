"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskPriority = "high" | "medium" | "low";

interface TaskItemProps {
  id?: string;
  title: string;
  done?: boolean;
  priority?: TaskPriority;
  dueDate?: string;
  onToggle?: () => void;
  onClick?: () => void;
  className?: string;
}

const priorityColors: Record<TaskPriority, string> = {
  high: "text-red-500",
  medium: "text-yellow-500",
  low: "text-blue-500",
};

/**
 * タスクアイテム - タスクの表示
 * 最小単位コンポーネント：ドラッグ&ドロップの対象
 */
export function TaskItem({
  title,
  done,
  priority,
  dueDate,
  onToggle,
  onClick,
  className,
}: TaskItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-accent/40 transition-all duration-200",
        onClick && "cursor-pointer",
        className
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.();
        }}
        className="mt-0.5 flex-shrink-0"
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : (
          <Circle
            className={cn(
              "h-4 w-4",
              priority ? priorityColors[priority] : "text-muted-foreground/50"
            )}
          />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[14px] truncate",
            done && "line-through text-muted-foreground/50"
          )}
        >
          {title}
        </p>
        {dueDate && (
          <p className="text-[12px] text-muted-foreground/50 mt-1">{dueDate}</p>
        )}
      </div>
    </div>
  );
}
