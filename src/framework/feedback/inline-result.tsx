import * as React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "cn";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type InlineResultTone = "success" | "error" | "info";

export type InlineResultState = {
  tone: InlineResultTone;
  title: React.ReactNode;
  detail?: React.ReactNode;
};

// Results that the operator has to read carefully stay on the page instead of
// disappearing as a toast. The error tone doubles as the accessible alert; the
// other tones announce politely so they never interrupt a screen reader.
const TONE_META: Record<InlineResultTone, { Icon: typeof Info; className: string }> = {
  success: {
    Icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  error: {
    Icon: AlertCircle,
    className: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-400",
  },
  info: {
    Icon: Info,
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300",
  },
};

// Compact rows keep short results on a single line. The detail still wraps
// instead of truncating, so a long backend message is never lost.
const COMPACT_BASE = "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md border px-2.5 py-2 text-left text-sm";

export function InlineResult({
  tone = "info",
  title,
  detail,
  className,
  compact,
}: InlineResultState & { className?: string; compact?: boolean }) {
  const { Icon, className: toneClassName } = TONE_META[tone];

  if (compact) {
    return (
      <div
        role={tone === "error" ? "alert" : "status"}
        aria-live={tone === "error" ? undefined : "polite"}
        className={cn(COMPACT_BASE, toneClassName, className)}
      >
        <Icon className="size-4 shrink-0 translate-y-0.5" />
        <span className="font-medium">{title}</span>
        {detail ? <span className="min-w-0 break-words">{detail}</span> : null}
      </div>
    );
  }

  return (
    <Alert
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? undefined : "polite"}
      className={cn(toneClassName, className)}
    >
      <Icon className="size-4" />
      <div className="min-w-0 space-y-0.5">
        <AlertTitle>{title}</AlertTitle>
        {detail ? (
          <AlertDescription className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-current">
            {detail}
          </AlertDescription>
        ) : null}
      </div>
    </Alert>
  );
}
