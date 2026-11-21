import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "cn";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Block-level read failure: the section could not load and the operator needs
 * a retry in place. Action results use InlineResult instead.
 */
export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Alert
      className={cn(
        "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-400",
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
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  );
}
