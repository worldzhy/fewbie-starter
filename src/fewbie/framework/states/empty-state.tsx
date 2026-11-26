import * as React from "react";
import { Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared empty state. Pages pass resolved copy (and an optional action) so the
 * component stays free of translation keys and host vocabulary.
 *
 * `as` selects the container tone (page-level dashed border by default,
 * card-style solid border with `as="card"`). `fullHeight` stretches the
 * container to fill its parent — useful when the empty state sits inside a
 * flex column whose sibling header/footer pin the layout height.
 * `actionPending` disables the action and swaps its leading slot for a
 * spinner, letting the state remain visible while a primary operation runs.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  as = "page",
  fullHeight = false,
  actionPending = false,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Overrides the default inbox glyph. */
  icon?: React.ReactNode;
  className?: string;
  /** `page` (dashed border, default) or `card` (solid border + card surface). */
  as?: "page" | "card";
  /** Stretch to fill the parent's height. */
  fullHeight?: boolean;
  /** Disable the action and show a spinner in its place. */
  actionPending?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        as === "card" ? "rounded-lg border border-border bg-card" : "rounded-lg border border-dashed border-border",
        fullHeight && "h-full min-h-full",
        className,
      )}
    >
      <div className="text-muted-foreground" aria-hidden="true">
        {icon ?? <Inbox className="size-8" />}
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {description ? <div className="max-w-md text-sm text-muted-foreground">{description}</div> : null}
      </div>
      {action ? (
        <div className="pt-1" aria-busy={actionPending || undefined}>
          {actionPending ? <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" /> : action}
        </div>
      ) : null}
    </div>
  );
}
