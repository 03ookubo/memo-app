"use client";

import type { ReactNode } from "react";

interface SectionLabelProps {
  children: ReactNode;
}

/**
 * セクションラベル - 各セクションの見出しに使用
 * 共通の最小単位コンポーネント
 */
export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <div className="px-3 py-2 text-[12px] font-medium uppercase tracking-wider text-muted-foreground/60">
      {children}
    </div>
  );
}
