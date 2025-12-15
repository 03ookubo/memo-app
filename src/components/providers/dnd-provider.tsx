"use client";

import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { type ReactNode } from "react";

interface DndProviderProps {
  children: ReactNode;
  onDragEnd?: (event: DragEndEvent) => void;
}

export function DndProvider({ children, onDragEnd }: DndProviderProps) {
  const handleDragEnd = (event: DragEndEvent) => {
    onDragEnd?.(event);
  };

  return <DndContext onDragEnd={handleDragEnd}>{children}</DndContext>;
}
