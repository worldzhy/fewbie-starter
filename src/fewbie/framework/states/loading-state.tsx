"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /** Visible label; callers that need i18n resolve it before passing it in. */
  label?: string;
  /** `block` fills its parent; `overlay` pins to the viewport. */
  variant?: "block" | "overlay";
  className?: string;
  /** `page` (loose padded box, default) or `card` (compact solid card). */
  as?: "page" | "card";
  /** Stretch to fill the parent's height. Has no effect when variant is overlay. */
  fullHeight?: boolean;
}

/**
 * Loading surface shared by every page. `block` is the normal in-flow state;
 * `overlay` blocks the whole content area while a page-level fetch runs.
 */
export function LoadingState({
  label,
  variant = "block",
  className,
  as = "page",
  fullHeight = false,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        variant === "overlay"
          ? "fixed inset-0 z-50 bg-background/60"
          : cn("h-full min-h-40 w-full", fullHeight && "min-h-full"),
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "flex size-50 flex-col items-center justify-center rounded-lg border",
          as === "card" ? "border-border bg-card" : "border-border bg-background",
        )}
      >
        <Loader2 className="size-17.5 animate-spin text-primary" />
        {label ? <div className="mt-8 text-sm text-muted-foreground">{label}</div> : null}
      </div>
    </div>
  );
}
