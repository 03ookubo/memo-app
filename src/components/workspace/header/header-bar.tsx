"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Trash2,
  Plus,
  X,
  FileText,
  FolderPlus,
  MoreVertical,
  Download,
  Star,
  Archive,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

interface HeaderBarProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

/**
 * ヘッダーバー - Dribbble Tab Design 2 スタイル
 */
export function HeaderBar({ sidebarOpen = true, onToggleSidebar }: HeaderBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex h-12 items-center justify-between border-b border-border/40 bg-background px-3">
      {/* Left - Toggle + Tab */}
      <div className="flex items-center gap-2">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/60 hover:bg-accent/40 hover:text-foreground transition-all duration-200"
                onClick={onToggleSidebar}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              <span className="text-[13px]">{sidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Active tab */}
        <div className="flex items-center gap-2 rounded-xl bg-accent/40 px-3 py-1.5">
          <FileText className="h-4 w-4 text-primary/80" />
          <span className="text-[13px] font-medium">ノートを選択</span>
        </div>
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-sm mx-4">
        {searchOpen ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="検索..."
              className="h-8 pl-8 pr-8 text-[13px] bg-accent/30 border-0 rounded-xl focus-visible:ring-1 focus-visible:ring-ring/50"
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors duration-200"
              onClick={() => setSearchOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            className="flex w-full items-center gap-2 rounded-xl bg-accent/30 px-3 py-1.5 text-[13px] text-muted-foreground/60 hover:bg-accent/40 transition-all duration-200"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span>検索...</span>
            <kbd className="ml-auto rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
          </button>
        )}
      </div>

      {/* Right - Actions */}
      <TooltipProvider delayDuration={0}>
        <div className="flex items-center gap-0.5">
          {/* New */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-xl bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 transition-all duration-200">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">新規</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="gap-2 text-[13px]">
                <FileText className="h-4 w-4" />
                新規ノート
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-[13px]">
                <FolderPlus className="h-4 w-4" />
                新規プロジェクト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Favorite */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/50 hover:bg-accent/40 hover:text-foreground transition-all duration-200">
                <Star className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              <span className="text-[13px]">お気に入り</span>
            </TooltipContent>
          </Tooltip>

          {/* More */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/50 hover:bg-accent/40 hover:text-foreground transition-all duration-200">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="gap-2 text-[13px]">
                <Download className="h-4 w-4" />
                エクスポート
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-[13px]">
                <Archive className="h-4 w-4" />
                アーカイブ
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-[13px] text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TooltipProvider>
    </div>
  );
}
