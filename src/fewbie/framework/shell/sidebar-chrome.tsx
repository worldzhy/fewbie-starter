"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/fewbie/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/fewbie/ui/tooltip";
import { cn } from "cn";

interface SidebarNavLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
  /** Render as a non-clickable placeholder for upcoming features. */
  disabled?: boolean;
  /** Tooltip shown for a disabled entry; host copy stays with the host. */
  disabledHint?: string;
}

// Leaf navigation row: full row when expanded, centered icon button with a
// tooltip when collapsed.
export function SidebarNavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  disabled,
  disabledHint,
}: SidebarNavLinkProps) {
  const iconColor = disabled ? "text-muted-foreground/50" : active ? "text-primary" : "text-muted-foreground";

  const className = collapsed
    ? cn(
        "mx-auto mt-1 flex h-10 w-10 items-center justify-center rounded-md",
        disabled
          ? "cursor-not-allowed text-muted-foreground/50"
          : active
            ? "bg-card font-semibold text-primary shadow-xs ring-1 ring-border"
            : "text-foreground hover:bg-card/60",
      )
    : cn(
        "mt-1 flex min-h-10 items-center gap-3 rounded-md px-4",
        disabled
          ? "cursor-not-allowed text-muted-foreground/50"
          : active
            ? "bg-card font-semibold text-primary shadow-xs ring-1 ring-border"
            : "text-foreground hover:bg-card/60",
      );

  const inner = disabled ? (
    <div className={className} title={disabledHint} aria-disabled="true">
      <Icon className={cn("size-4", iconColor)} />
      {!collapsed && <span>{label}</span>}
    </div>
  ) : (
    <Link
      href={href}
      className={className}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
    >
      <Icon className={cn("size-4", iconColor)} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  if (!collapsed) return inner;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

interface SidebarBackButtonProps {
  collapsed: boolean;
  label: string;
  backAriaLabel: string;
  onClick: () => void;
  /** Optional trailing action rendered next to the label (expanded mode only). */
  trailing?: React.ReactNode;
}

// Header button: wide back-to-list button when expanded, square icon when
// collapsed. When `trailing` is provided, the back button becomes a flex
// sibling so the trailing action sits on the same row as the label.
export function SidebarBackButton({ collapsed, label, backAriaLabel, onClick, trailing }: SidebarBackButtonProps) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={backAriaLabel}
        className="mx-auto flex size-9 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <ArrowLeft className="size-4" />
      </button>
    );
  }

  const backButton = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-card pl-2.5 pr-3 text-sm font-semibold text-foreground shadow-xs transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        trailing ? "min-w-0 flex-1" : "w-full max-w-[240px]",
      )}
    >
      <ArrowLeft className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-primary" />
      <span className="truncate text-left">{label}</span>
    </button>
  );

  if (!trailing) return backButton;

  return (
    <div className="flex w-full max-w-[240px] items-center gap-1">
      {backButton}
      {trailing}
    </div>
  );
}

interface SidebarCollapseToggleProps {
  collapsed: boolean;
  onToggle: (value: boolean) => void;
  collapseLabel: string;
  expandLabel: string;
}

// Footer button that flips the sidebar between its expanded and rail widths.
export function SidebarCollapseToggle({ collapsed, onToggle, collapseLabel, expandLabel }: SidebarCollapseToggleProps) {
  const button = (
    <button
      type="button"
      onClick={() => onToggle(!collapsed)}
      aria-label={collapsed ? expandLabel : collapseLabel}
      aria-expanded={!collapsed}
      className={cn(
        "flex h-10 w-full cursor-pointer items-center rounded-md text-muted-foreground hover:bg-card/60 hover:text-foreground focus:outline-none",
        collapsed ? "justify-center" : "gap-2.5 px-3",
      )}
    >
      {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
      {!collapsed && <span className="text-sm">{collapseLabel}</span>}
    </button>
  );

  return (
    <div className="shrink-0 border-t border-border p-2">
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{expandLabel}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
    </div>
  );
}

// Hairline divider replacing text group labels in collapsed mode.
export function CollapsedGroupDivider() {
  return <div className="mx-2 border-t border-border" />;
}

interface CollapsedFlyoutMenuProps {
  icon: LucideIcon;
  /** Trigger aria label and flyout title. */
  label: string;
  active: boolean;
  children: React.ReactNode;
}

// Hover-opened flyout for groups whose children do not fit in the rail.
export function CollapsedFlyoutMenu({ icon: Icon, label, active, children }: CollapsedFlyoutMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [trackedPathname, setTrackedPathname] = React.useState(pathname);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close after navigation; the shell layout outlives page changes. Adjusting
  // state during render (React's documented prop-change pattern) avoids an
  // effect that fires after the destination page paints.
  if (pathname !== trackedPathname) {
    setTrackedPathname(pathname);
    if (open) setOpen(false);
  }

  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openMenu = React.useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const scheduleClose = React.useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, [cancelClose]);

  // Clear any pending close timer on unmount.
  React.useEffect(() => cancelClose, [cancelClose]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
          onFocus={openMenu}
          aria-label={label}
          className={cn(
            "mx-auto mt-1 flex h-10 w-10 items-center justify-center rounded-md",
            active
              ? "bg-card font-semibold text-primary shadow-xs ring-1 ring-border"
              : "text-foreground hover:bg-card/60",
          )}
        >
          <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
        className="flex w-52 flex-col gap-0 p-1.5"
      >
        <PopoverTitle className="truncate px-2 py-1.5 text-sm">{label}</PopoverTitle>
        {children}
      </PopoverContent>
    </Popover>
  );
}

interface FlyoutLinkProps {
  href: string;
  label: string;
  active: boolean;
  indented?: boolean;
}

export function FlyoutLink({ href, label, active, indented }: FlyoutLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block rounded-md py-1.5 pr-2 text-sm",
        indented ? "pl-5" : "pl-2",
        active
          ? "bg-card font-semibold text-primary shadow-xs ring-1 ring-border"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export function FlyoutSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</div>
  );
}
