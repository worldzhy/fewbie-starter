import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Inline read failure for table cells and tight card slots where the block
 * ErrorState does not fit. Destructive text plus an optional retry link.
 */
export function InlineErrorText({
  children,
  onRetry,
  retryLabel,
  className,
}: {
  children: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <span className={cn("text-sm text-destructive", className)}>
      {children}
      {onRetry ? (
        <>
          {" "}
          <button
            className="font-medium underline underline-offset-2 hover:no-underline"
            onClick={onRetry}
            type="button"
          >
            {retryLabel}
          </button>
        </>
      ) : null}
    </span>
  );
}
