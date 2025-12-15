"use client";

import { useState } from "react";
import {
  FileText,
  FolderOpen,
  Folder,
  Star,
  Clock,
  Trash2,
  Plus,
} from "lucide-react";
import { NavItem, TreeItem, CollapsibleSection } from "../components";
import { EmptyState } from "@/components/common";

/**
 * エクスプローラーコンテンツ - ファイル/フォルダのツリー表示
 */
export function ExplorerContent() {
  const [favOpen, setFavOpen] = useState(true);
  const [projOpen, setProjOpen] = useState(true);
  const [workOpen, setWorkOpen] = useState(true);

  return (
    <div className="space-y-1.5">
      {/* Quick Access */}
      <div className="space-y-1">
        <NavItem icon={Clock} label="最近" count={5} />
        <NavItem icon={Star} label="お気に入り" active />
        <NavItem icon={Trash2} label="ゴミ箱" />
      </div>

      <div className="my-3 h-px bg-border/40" />

      {/* Favorites */}
      <CollapsibleSection
        title="お気に入り"
        open={favOpen}
        onToggle={() => setFavOpen(!favOpen)}
      >
        <TreeItem icon={FileText} label="プロジェクト計画" level={1} />
        <TreeItem icon={FileText} label="アイデアメモ" level={1} />
      </CollapsibleSection>

      {/* Projects */}
      <CollapsibleSection
        title="プロジェクト"
        open={projOpen}
        onToggle={() => setProjOpen(!projOpen)}
      >
        <TreeItem
          icon={workOpen ? FolderOpen : Folder}
          label="仕事"
          level={1}
          expandable
          expanded={workOpen}
          onToggle={() => setWorkOpen(!workOpen)}
        />
        {workOpen && (
          <>
            <TreeItem icon={FileText} label="議事録" level={2} />
            <TreeItem icon={FileText} label="タスク一覧" level={2} />
          </>
        )}
        <TreeItem icon={Folder} label="個人" level={1} expandable />
        <TreeItem icon={Folder} label="学習" level={1} expandable />
      </CollapsibleSection>

      {/* Empty state hint */}
      <EmptyState
        icon={FolderOpen}
        title={`プロジェクトを作成して\nノートを整理しましょう`}
        action={{
          icon: Plus,
          label: "新規プロジェクト",
        }}
        className="mt-6"
      />
    </div>
  );
}
