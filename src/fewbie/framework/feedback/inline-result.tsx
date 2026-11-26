import * as React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

import { Alert, AlertDescription, AlertTitle } from "@/fewbie/ui/alert";

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
    className: "border-success/30 bg-success/10 text-success",
  },
  error: {
    Icon: AlertCircle,
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  info: {
    Icon: Info,
    className: "border-primary/30 bg-primary/10 text-primary",
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
