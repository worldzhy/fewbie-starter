import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "cn";

/**
 * Shared empty state. Pages pass resolved copy (and an optional action) so the
 * component stays free of translation keys and host vocabulary.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Overrides the default inbox glyph. */
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center",
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
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
