"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  // A mouse/Enter click goes through the Link, which already navigates. The
  // flag lets `onValueChange` skip that duplicate push while still handling
  // keyboard tab selection, which never clicks the anchor (R82-20).
  const navigatedByLink = useRef(false);
  // A nested route (e.g. /modules/history) also prefix-matches its parent tab
  // (/modules), so the most specific matching href must win. A route outside
  // the tab set leaves no tab active rather than falsely marking the first one.
  const activeHref =
    items
      .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "";

  return (
    <Tabs
      value={activeHref}
      onValueChange={(href) => {
        if (navigatedByLink.current) {
          navigatedByLink.current = false;
          return;
        }
        router.push(href);
      }}
      className={cn(className)}
    >
      <TabsList aria-label={ariaLabel}>
        {items.map((item) => (
          <TabsTrigger key={item.href} value={item.href} asChild>
            <Link
              href={item.href}
              onClick={() => {
                navigatedByLink.current = true;
              }}
            >
              {item.label}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
