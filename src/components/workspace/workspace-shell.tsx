"use client";

import { useState, useCallback } from "react";
import { ActivityBar } from "./activity-bar/activity-bar";
import { Sidebar } from "./sidebar/sidebar";
import { HeaderBar } from "./header/header-bar";
import { EditorArea } from "./editor/editor-area";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export type ViewType = "explorer" | "search" | "tasks" | "calendar";

/**
 * ワークスペースシェル
 * モダンなダッシュボードレイアウト（Dribbble参考）
 */
export function WorkspaceShell() {
  const [activeView, setActiveView] = useState<ViewType>("explorer");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = useCallback((view: ViewType) => {
    if (activeView === view && sidebarOpen) {
      setSidebarOpen(false);
    } else {
      setActiveView(view);
      setSidebarOpen(true);
    }
  }, [activeView, sidebarOpen]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  return (
    <div className="flex h-full w-full bg-background">
      {/* Activity Bar (左端ナビゲーション) */}
      <ActivityBar
        activeView={activeView}
        onViewChange={toggleSidebar}
      />

      {/* メインエリア */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Sidebar */}
        {sidebarOpen && (
          <>
            <ResizablePanel
              defaultSize={22}
              minSize={18}
              maxSize={35}
              className="border-r border-border/50"
            >
              <Sidebar activeView={activeView} />
            </ResizablePanel>
            <ResizableHandle 
              withHandle 
              className="w-1 bg-transparent hover:bg-primary/20 transition-colors"
            />
          </>
        )}

        {/* Editor Area */}
        <ResizablePanel defaultSize={78}>
          <div className="flex h-full flex-col">
            {/* Header (タブバー + グローバルアクション) */}
            <HeaderBar 
              sidebarOpen={sidebarOpen}
              onToggleSidebar={handleToggleSidebar}
            />

            {/* Editor */}
            <EditorArea />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
