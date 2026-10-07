'use client';

import type { PageMeta } from '@/types';

/**
 * Every admin list used to request ?limit=100, the validator's ceiling, and
 * render whatever came back, so past 100 records older rows simply vanished
 * with no indication anything was missing. The API has always returned full
 * page meta; this surfaces it.
 */
export function Pagination({
  meta,
  onPageChange,
  busy = false,
}: {
  meta?: PageMeta;
  onPageChange: (page: number) => void;
  busy?: boolean;
}) {
  if (!meta || meta.total === 0) return null;

  const { page, limit, total, totalPages, hasNextPage, hasPrevPage } = meta;

  const firstShown = (page - 1) * limit + 1;
  const lastShown = Math.min(page * limit, total);

  // A single page of results needs a count, not controls.
  if (totalPages <= 1) {
    return (
      <p className="mt-4 text-xs text-muted">
        {total} {total === 1 ? 'item' : 'items'}
      </p>
    );
  }

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-xs text-muted">
        Showing {firstShown}-{lastShown} of {total}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage || busy}
          className="rounded-full border border-cream-300 px-4 py-1.5 text-xs transition-colors hover:border-gold-500 disabled:opacity-40 disabled:hover:border-cream-300"
        >
          ← Previous
        </button>
        <span className="text-xs text-muted" aria-current="page">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage || busy}
          className="rounded-full border border-cream-300 px-4 py-1.5 text-xs transition-colors hover:border-gold-500 disabled:opacity-40 disabled:hover:border-cream-300"
        >
          Next →
        </button>
      </div>
    </nav>
  );
}
