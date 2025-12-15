"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EventItem } from "../components";
import { SectionLabel } from "@/components/common";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * カレンダーコンテンツ - ミニカレンダーとイベント表示
 */
export function CalendarContent() {
  const today = new Date();
  const currentMonth = today.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-medium">{currentMonth}</span>
        <div className="flex gap-1">
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/50 hover:bg-accent/40 hover:text-foreground transition-all duration-200">
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/50 hover:bg-accent/40 hover:text-foreground transition-all duration-200">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mini calendar */}
      <MiniCalendar today={today} />

      {/* Today's events */}
      <div>
        <SectionLabel>今日のイベント</SectionLabel>
        <div className="space-y-2">
          <EventItem time="10:00" title="チームミーティング" color="blue" />
          <EventItem time="14:00" title="プレゼン準備" color="green" />
        </div>
      </div>
    </div>
  );
}

/**
 * ミニカレンダー - 月間カレンダー表示
 */
function MiniCalendar({ today }: { today: Date }) {
  return (
    <div className="rounded-xl border border-border/30 p-3">
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-1.5 text-[11px] font-medium text-muted-foreground/50"
          >
            {day}
          </div>
        ))}
        {Array.from({ length: 35 }, (_, i) => {
          const day = i - 6 + 1;
          const isToday = day === today.getDate();
          const isCurrentMonth = day > 0 && day <= 31;
          return (
            <button
              key={i}
              className={cn(
                "aspect-square rounded-lg text-[12px] transition-all duration-200",
                isToday
                  ? "bg-primary text-primary-foreground font-medium"
                  : isCurrentMonth
                  ? "hover:bg-accent/40 text-foreground"
                  : "text-muted-foreground/20"
              )}
            >
              {isCurrentMonth ? day : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
