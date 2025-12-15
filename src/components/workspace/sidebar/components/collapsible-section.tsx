"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * 折りたたみセクション - 開閉可能なセクション
 * 最小単位コンポーネント
 */
export function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
        )}
        <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground/60">
          {title}
        </span>
      </button>
      {open && <div className="space-y-1">{children}</div>}
    </div>
  );
}
