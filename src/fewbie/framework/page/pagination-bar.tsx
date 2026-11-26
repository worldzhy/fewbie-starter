"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/fewbie/ui/button";

/** Every string the bar renders or announces. */
export interface PaginationBarLabels {
  /** Previous-page button copy. */
  previous: string;
  /** Next-page button copy. */
  next: string;
  /** 1-based page summary, e.g. `Page 2 of 7`. */
  pageOf: (page: number, totalPages: number) => string;
  /** Optional 1-based record summary, e.g. `128 records`. */
  recordCount?: (total: number) => string;
}

export interface PaginationBarProps {
  /** 0-based page index, matching the account/audit list endpoints. */
  page: number;
  pageSize: number;
  /** Total records across all pages. */
  total: number;
  onPageChange: (page: number) => void;
  labels: PaginationBarLabels;
  className?: string;
}

/**
 * Server-side pager: the caller owns the query and re-fetches on page change.
 * `DataTable` already pages a fully-loaded array; this bar is for endpoints that
 * return one page plus a total.
 */
export function PaginationBar({ page, pageSize, total, onPageChange, labels, className }: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(page, 0), totalPages - 1);
  const summary = labels.recordCount?.(total);

  return (
    <div
      className={cn("mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground", className)}
    >
      <span>{summary ?? null}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={current <= 0}
          onClick={() => onPageChange(current - 1)}
        >
          <ChevronLeft className="size-4" />
          {labels.previous}
        </Button>
        <span className="whitespace-nowrap">{labels.pageOf(current + 1, totalPages)}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={current >= totalPages - 1}
          onClick={() => onPageChange(current + 1)}
        >
          {labels.next}
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
