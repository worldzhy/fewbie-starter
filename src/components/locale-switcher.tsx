"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const LOCALE_LABELS: Record<string, string> = {
  en: "EN",
  zh: "中文",
};

/**
 * Toggle for the UI language. There is no `[locale]` route segment, so the
 * locale travels in the NEXT_LOCALE cookie rather than the URL (see
 * src/i18n/config.ts); a refresh re-renders the server tree in the newly
 * selected locale.
 *
 * Mount it wherever the language control belongs (e.g. an app header).
 */
export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const nextLocale = locale === "zh" ? "en" : "zh";
  // The only intentionally untranslated copy here: the label must be readable
  // whichever locale is currently active.
  const ariaLabel = nextLocale === "zh" ? "Switch to Chinese" : "切换到英文";

  const switchLocale = () => {
    document.cookie = `NEXT_LOCALE=${nextLocale};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={ariaLabel}
      onClick={switchLocale}
      className="gap-1.5 text-muted-foreground hover:text-foreground"
    >
      <Languages className="size-4" />
      {LOCALE_LABELS[locale] ?? locale.toUpperCase()}
    </Button>
  );
}
