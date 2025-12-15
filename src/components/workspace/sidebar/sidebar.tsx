"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarHeader } from "./sidebar-header";
import {
  ExplorerContent,
  SearchContent,
  TasksContent,
  CalendarContent,
} from "./views";
import type { ViewType } from "../workspace-shell";

interface SidebarProps {
  activeView: ViewType;
}

/**
 * サイドバー - Dribbble Tab Design 2 スタイル
 * コンテンツは各ビューコンポーネントに分割
 */
export function Sidebar({ activeView }: SidebarProps) {
  return (
    <div className="flex h-full w-full flex-col bg-sidebar">
      <SidebarHeader activeView={activeView} />
      <ScrollArea className="flex-1">
        <div className="px-3 py-3">
          <SidebarContent activeView={activeView} />
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * サイドバーコンテンツ - ビューに応じたコンテンツを表示
 */
function SidebarContent({ activeView }: { activeView: ViewType }) {
  switch (activeView) {
    case "explorer":
      return <ExplorerContent />;
    case "search":
      return <SearchContent />;
    case "tasks":
      return <TasksContent />;
    case "calendar":
      return <CalendarContent />;
    default:
      return null;
  }
}
