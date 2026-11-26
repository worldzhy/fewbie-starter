"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SidebarShellProps {
  collapsed: boolean;
  /** Header slot: back button, entity title and optional trailing action. */
  header: React.ReactNode;
  /** Navigation tree assembled by the host from the sidebar-chrome atoms. */
  nav: React.ReactNode;
  /** Footer slot, typically SidebarCollapseToggle. */
  footer?: React.ReactNode;
  /**
   * Offset of the fixed sidebar, e.g. "top-14" when the platform topbar is
   * 3.5rem tall. Hosts own the platform chrome height.
   */
  topOffsetClassName?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Account-level sidebar skeleton shared by every scoped layout. Owns only the
 * frame, collapse transition and content inset; the navigation model stays
 * with the host so grouped, flyout and dynamic entries keep working.
 */
export function SidebarShell({
  collapsed,
  header,
  nav,
  footer,
  topOffsetClassName = "top-0",
  className,
  children,
}: SidebarShellProps) {
  return (
    <div className={cn("flex bg-background", className)}>
      <aside
        className={cn(
          "fixed bottom-0 left-0 z-20 flex flex-col border-r border-border bg-muted transition-[width] duration-200",
          topOffsetClassName,
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-border px-3">{header}</div>
        <nav className={cn("min-h-0 flex-1 space-y-2 overflow-y-auto", collapsed ? "px-2" : "px-3")}>{nav}</nav>
        {footer}
      </aside>

      <main
        className={cn("min-w-0 flex-1 bg-background transition-[margin] duration-200", collapsed ? "ml-16" : "ml-60")}
      >
        {children}
      </main>
    </div>
  );
}
