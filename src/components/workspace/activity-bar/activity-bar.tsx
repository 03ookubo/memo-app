"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Folder,
  Search,
  CheckCircle2,
  Calendar,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { ViewType } from "../workspace-shell";

interface ActivityBarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const views: { id: ViewType; icon: typeof Folder; label: string }[] = [
  { id: "explorer", icon: Folder, label: "エクスプローラー" },
  { id: "search", icon: Search, label: "検索" },
  { id: "tasks", icon: CheckCircle2, label: "タスク" },
  { id: "calendar", icon: Calendar, label: "カレンダー" },
];

/**
 * アクティビティバー
 * Dribbble Tab Design 2 スタイル
 */
export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-full w-[52px] flex-col items-center bg-sidebar py-3">
      <TooltipProvider delayDuration={0}>
        {/* Logo */}
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-[13px] font-semibold">M</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col items-center gap-0.5">
          {views.map(({ id, icon: Icon, label }) => {
            const isActive = activeView === id;
            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
                      isActive 
                        ? "bg-accent/60 text-foreground" 
                        : "text-muted-foreground/50 hover:bg-accent/40 hover:text-foreground"
                    )}
                    onClick={() => onViewChange(id)}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <span className="text-[13px]">{label}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="flex flex-col items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground/50 hover:bg-accent/40 hover:text-foreground transition-all duration-200"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <span className="text-[13px]">テーマ切替</span>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground/50 hover:bg-accent/40 hover:text-foreground transition-all duration-200">
                <Settings className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <span className="text-[13px]">設定</span>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
