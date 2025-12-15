"use client";

import { cn } from "@/lib/utils";

export type EventColor = "blue" | "green" | "red" | "yellow";

interface EventItemProps {
  id?: string;
  time: string;
  title: string;
  color: EventColor;
  onClick?: () => void;
  className?: string;
}

const colorStyles: Record<EventColor, string> = {
  blue: "bg-blue-500/10 border-l-blue-500",
  green: "bg-green-500/10 border-l-green-500",
  red: "bg-red-500/10 border-l-red-500",
  yellow: "bg-yellow-500/10 border-l-yellow-500",
};

/**
 * イベントアイテム - カレンダーイベントの表示
 * 最小単位コンポーネント：ドラッグ&ドロップの対象
 */
export function EventItem({
  time,
  title,
  color,
  onClick,
  className,
}: EventItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-r-xl border-l-2 px-3 py-2 transition-all duration-200 hover:opacity-70",
        colorStyles[color],
        onClick && "cursor-pointer",
        className
      )}
    >
      <p className="text-[11px] text-muted-foreground/50 font-medium">{time}</p>
      <p className="text-[14px] truncate">{title}</p>
    </div>
  );
}
