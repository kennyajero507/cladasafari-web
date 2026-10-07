'use client';

import { useEffect, useState } from 'react';
import { useDebounced } from '@/lib/useListParams';

export interface SortOption {
  value: string;
  label: string;
}

/**
 * Search box, optional sort control and filter chips for the admin lists.
 *
 * Before this, none of the lists had search: finding one tour among eighty
 * meant paging through them 25 at a time and reading every row.
 */
export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  sort,
  sorts,
  onSortChange,
  filters,
  busy = false,
  resultLabel,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  sort?: string;
  sorts?: SortOption[];
  onSortChange?: (value: string) => void;
  /** Rendered to the right of the search row, status chips, usually. */
  filters?: React.ReactNode;
  busy?: boolean;
  /** e.g. "12 results for “lions”", announced when a search settles. */
  resultLabel?: string;
}) {
  // The input is immediate; the committed value trails it so a request is not
  // fired per keystroke.
  const [draft, setDraft] = useState(search);
  const debounced = useDebounced(draft, 300);

  // Adopt external changes (Back/Forward, or a cleared filter) without fighting
  // what is currently being typed.
  useEffect(() => {
    setDraft((current) => (current === search ? current : search));
  }, [search]);

  useEffect(() => {
    if (debounced !== search) onSearchChange(debounced);
    // onSearchChange identity is not stable across renders in every caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="list-search" className="sr-only">
            {searchPlaceholder}
          </label>
          <input
            id="list-search"
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 w-full rounded-full border border-cream-300 pl-10 pr-4 text-sm focus:border-gold-500 focus:outline-none"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted"
          >
            ⌕
          </span>
          {draft ? (
            <button
              type="button"
              onClick={() => setDraft('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
            >
              ×
            </button>
          ) : null}
        </div>

        {sorts && sorts.length > 0 && onSortChange ? (
          <div className="flex items-center gap-2">
            <label htmlFor="list-sort" className="text-xs text-muted">
              Sort
            </label>
            <select
              id="list-sort"
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              className="h-11 rounded-full border border-cream-300 bg-white px-4 text-sm focus:border-gold-500 focus:outline-none"
            >
              {sorts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
      </div>

      {/* Announced politely so a screen-reader user learns the result count
          once the debounced search settles. */}
      <p aria-live="polite" className="text-xs text-muted">
        {busy ? 'Searching…' : resultLabel}
      </p>
    </div>
  );
}
