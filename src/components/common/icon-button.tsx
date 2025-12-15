"use client";

import { forwardRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface IconButtonProps {
  icon: LucideIcon;
  tooltip?: string;
  onClick?: () => void;
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "default";
}

const sizeStyles = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-9 w-9",
};

const iconSizeStyles = {
  sm: "h-4 w-4",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

/**
 * アイコンボタン - ツールチップ付きのアイコンボタン
 * 共通の最小単位コンポーネント
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      icon: Icon,
      tooltip,
      onClick,
      className,
      iconClassName,
      size = "md",
      variant = "ghost",
    },
    ref
  ) {
    const button = (
      <button
        ref={ref}
        onClick={onClick}
        className={cn(
          "flex items-center justify-center rounded-lg transition-all duration-200",
          variant === "ghost" &&
            "text-muted-foreground/60 hover:bg-accent/40 hover:text-foreground",
          variant === "default" &&
            "bg-accent/40 text-muted-foreground hover:bg-accent hover:text-foreground",
          sizeStyles[size],
          className
        )}
      >
        <Icon className={cn(iconSizeStyles[size], iconClassName)} />
      </button>
    );

    if (!tooltip) return button;

    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={4}>
            <span className="text-[13px]">{tooltip}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);
