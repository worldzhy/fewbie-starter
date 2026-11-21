"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type SectionTabItem = {
  href: string;
  label: string;
};

/**
 * Shared route-based section navigation. Each item is its own URL so browser
 * history and deeplinking keep working; the active tab is derived from the
 * current pathname (exact match or a nested child route).
 */
export default function SectionTabs({
  items,
  ariaLabel,
  className,
}: {
  items: readonly SectionTabItem[];
  ariaLabel?: string;
  className?: string;
}) {
  const pathname = usePathname() ?? "";
  // A nested route (e.g. /modules/history) also prefix-matches its parent tab
  // (/modules), so the most specific matching href must win.
  const activeHref =
    items
      .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ??
    items[0]?.href ??
    "";

  return (
    <Tabs value={activeHref} className={cn(className)}>
      <TabsList aria-label={ariaLabel}>
        {items.map((item) => (
          <TabsTrigger key={item.href} value={item.href} asChild>
            <Link href={item.href}>{item.label}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
