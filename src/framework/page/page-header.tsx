import React from "react";

interface PageHeaderProps {
  /** Main page title, usually matching the navigation entry label. */
  title: React.ReactNode;
  /** Optional short explanation rendered under the title. */
  subtitle?: React.ReactNode;
  /** Optional action area (buttons, filters) aligned to the right of the title. */
  actions?: React.ReactNode;
  /**
   * Heading level for the title. A page keeps one `h1`, so a shell nested in a
   * page (or in a layout that already rendered a header) passes 2 or 3.
   */
  headingLevel?: 1 | 2 | 3;
  /** Optional className for the outer container, allowing spacing tweaks. */
  className?: string;
}

/**
 * Unified content-area header for every page. Keeps title typography, spacing
 * and the optional subtitle / action-row layout consistent so pages do not
 * render their own header variants.
 */
const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, headingLevel = 1, className }) => {
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";
  return (
    <div
      className={`mb-6 flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between ${className ?? ""}`}
    >
      <div className="min-w-0">
        <div className="mb-2 h-1 w-8 rounded-full bg-primary" aria-hidden="true" />
        <Heading className="text-2xl font-semibold tracking-tight text-foreground">{title}</Heading>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
      </div>

      {actions ? <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
};

export default PageHeader;
