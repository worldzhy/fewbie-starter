import * as React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/fewbie/ui/alert";
import { Button } from "@/fewbie/ui/button";

/**
 * Block-level read failure: the section could not load and the operator needs
 * a retry in place. Action results use InlineResult instead.
 *
 * `as` selects the container tone (inline alert by default, card-style solid
 * border + card surface with `as="card"`). `fullHeight` stretches the alert
 * to fill its parent's height. `actionPending` disables the retry button and
 * shows a spinner instead — useful when the operator just clicked retry.
 */
export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  className,
  as = "page",
  fullHeight = false,
  actionPending = false,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
  /** `page` (alert, default) or `card` (solid border + card surface). */
  as?: "page" | "card";
  /** Stretch to fill the parent's height. */
  fullHeight?: boolean;
  /** Disable the retry button and show a spinner in its place. */
  actionPending?: boolean;
}) {
  return (
    <Alert
      className={cn(
        as === "card"
          ? "border-border bg-card text-card-foreground"
          : "border-destructive/30 bg-destructive/10 text-destructive",
        fullHeight && "h-full min-h-full",
        className,
      )}
    >
      <AlertCircle className="size-4 shrink-0" />
      <div className="min-w-0 space-y-0.5">
        <AlertTitle>{title}</AlertTitle>
        {description ? (
          <AlertDescription className="break-words whitespace-pre-wrap text-current">{description}</AlertDescription>
        ) : null}
      </div>
      {onRetry ? (
        <AlertAction>
          {actionPending ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <Button variant="outline" size="sm" onClick={onRetry} disabled={actionPending}>
              {retryLabel}
            </Button>
          )}
        </AlertAction>
      ) : null}
    </Alert>
  );
}
