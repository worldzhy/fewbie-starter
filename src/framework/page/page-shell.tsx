"use client";

import React, { createContext, useContext } from "react";
import { cn } from "cn";

import PageHeader from "./page-header";

const PageShellHeaderActionsContext = createContext<React.ReactNode>(null);

/**
 * Lets a wrapping layout contribute actions into the header of every
 * descendant PageShell (e.g. a shared switcher), so pages do not re-render
 * them.
 */
export function PageShellActions({ actions, children }: { actions: React.ReactNode; children: React.ReactNode }) {
  return <PageShellHeaderActionsContext.Provider value={actions}>{children}</PageShellHeaderActionsContext.Provider>;
}

interface PageShellProps {
  /**
   * Canvas width. `full` (default) lets the surrounding layout own the width;
   * `default` and `wide` centre the content on a max-width canvas.
   */
  width?: "default" | "wide" | "full";
  /**
   * Which layer owns the content inset. `platform` means the page sits
   * directly under the platform shell and PageShell supplies the inset;
   * `none` means an enclosing layout already owns it.
   */
  inset?: "platform" | "none";
  // Optional PageHeader content; the header renders only when `title` is given.
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  // Extra classes for the header container only (e.g. mb-8).
  headerClassName?: string;
  // Extra classes for the page root.
  className?: string;
  children?: React.ReactNode;
}

const WIDTH_CLASS: Record<NonNullable<PageShellProps["width"]>, string> = {
  default: "mx-auto w-full max-w-6xl",
  wide: "mx-auto w-full max-w-7xl",
  full: "w-full",
};

/** Shared page canvas + optional PageHeader. */
const PageShell: React.FC<PageShellProps> = ({
  width = "full",
  inset = "platform",
  title,
  subtitle,
  actions,
  headerClassName,
  className,
  children,
}) => {
  const layoutActions = useContext(PageShellHeaderActionsContext);
  const mergedActions =
    layoutActions || actions ? (
      <>
        {layoutActions}
        {actions}
      </>
    ) : undefined;

  return (
    <div
      className={cn(
        "min-h-screen bg-background",
        inset === "platform" && "px-6 pb-8",
        WIDTH_CLASS[width],
        width !== "full" && "px-6 pb-8",
        className,
      )}
    >
      {title ? (
        <PageHeader title={title} subtitle={subtitle} actions={mergedActions} className={headerClassName} />
      ) : null}
      {children}
    </div>
  );
};

export default PageShell;
