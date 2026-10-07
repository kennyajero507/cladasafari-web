'use client';

import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  /**
   * Sort keys applied when the header is clicked, toggling between them. The
   * table only renders the control; the caller owns the request.
   */
  sort?: { asc: string; desc: string };
  /**
   * Hidden in the mobile card layout. Use for columns whose value is already
   * part of the primary cell, or that are noise on a small screen.
   */
  hideOnMobile?: boolean;
  /** Marks the cell rendered as the card's heading below `sm`. */
  primary?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  /** Current sort value, matched against each column's `sort` pair. */
  sort?: string;
  onSortChange?: (value: string) => void;
  /** Selection is enabled only when both of these are supplied. */
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  /** Rendered above the table while rows are selected. */
  bulkBar?: ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyTitle = 'Nothing here yet',
  emptyMessage = 'Create your first item to see it listed here.',
  emptyAction,
  sort,
  onSortChange,
  selected,
  onSelectedChange,
  bulkBar,
}: DataTableProps<T>) {
  const selectable = Boolean(selected && onSelectedChange);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-card border border-cream-200 bg-white">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-4 border-b border-cream-100 p-4 last:border-0">
            <div className="h-10 w-10 animate-pulse rounded bg-cream-200" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 w-1/3 animate-pulse rounded bg-cream-200" />
              <div className="h-3 w-1/5 animate-pulse rounded bg-cream-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-cream-300 bg-white px-6 py-16 text-center">
        <h3 className="mb-2 text-lg">{emptyTitle}</h3>
        <p className="mx-auto max-w-sm text-sm text-muted">{emptyMessage}</p>
        {emptyAction ? <div className="mt-6">{emptyAction}</div> : null}
      </div>
    );
  }

  const allKeys = rows.map(rowKey);
  const allSelected = selectable && allKeys.every((k) => selected!.has(k));
  const someSelected = selectable && !allSelected && allKeys.some((k) => selected!.has(k));

  function toggleAll() {
    if (!selectable) return;
    const next = new Set(selected);
    // Only the rows on this page: selecting across pages the admin cannot see
    // would make the bulk bar's count a claim they can't verify.
    if (allSelected) for (const k of allKeys) next.delete(k);
    else for (const k of allKeys) next.add(k);
    onSelectedChange!(next);
  }

  function toggleRow(key: string) {
    if (!selectable) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectedChange!(next);
  }

  const primaryCol = columns.find((c) => c.primary) ?? columns[0];
  const actionsCol = columns.find((c) => c.key === 'actions');

  return (
    <div className="space-y-3">
      {bulkBar}

      {/* Table from sm up. Below that the same rows render as cards, because a
          640px-wide table on a phone hid Status and the row actions off the
          right edge with no hint they were there. */}
      <div className="hidden overflow-x-auto rounded-card border border-cream-200 bg-white sm:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-cream-200 bg-cream-50">
            <tr>
              {selectable ? (
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      // Partial page selection reads as indeterminate, not off.
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    aria-label={allSelected ? 'Clear selection' : 'Select all on this page'}
                    className="h-4 w-4 accent-gold-500"
                  />
                </th>
              ) : null}

              {columns.map((col) => {
                const sortable = col.sort && onSortChange;
                const active = sortable && (sort === col.sort!.asc || sort === col.sort!.desc);
                const ascending = active && sort === col.sort!.asc;

                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      active ? (ascending ? 'ascending' : 'descending') : sortable ? 'none' : undefined
                    }
                    className={`px-4 py-3 text-xs uppercase tracking-wider text-muted ${col.className ?? ''}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() =>
                          onSortChange!(ascending ? col.sort!.desc : col.sort!.asc)
                        }
                        className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-ink ${
                          active ? 'text-ink' : ''
                        }`}
                      >
                        {col.header}
                        <span aria-hidden="true" className={active ? '' : 'opacity-30'}>
                          {active ? (ascending ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-cream-100">
            {rows.map((row) => {
              const key = rowKey(row);
              const isSelected = selectable && selected!.has(key);

              return (
                <tr
                  key={key}
                  className={`transition-colors ${isSelected ? 'bg-gold-50' : 'hover:bg-cream-50'}`}
                >
                  {selectable ? (
                    <td className="px-4 py-3 align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(key)}
                        aria-label={isSelected ? 'Deselect row' : 'Select row'}
                        className="h-4 w-4 accent-gold-500"
                      />
                    </td>
                  ) : null}

                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 align-middle ${col.className ?? ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards. */}
      <ul className="space-y-3 sm:hidden">
        {rows.map((row) => {
          const key = rowKey(row);
          const isSelected = selectable && selected!.has(key);
          const detailCols = columns.filter(
            (c) => c !== primaryCol && c.key !== 'actions' && !c.hideOnMobile
          );

          return (
            <li
              key={key}
              className={`rounded-card border bg-white p-4 ${
                isSelected ? 'border-gold-400 bg-gold-50' : 'border-cream-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {selectable ? (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRow(key)}
                    aria-label={isSelected ? 'Deselect item' : 'Select item'}
                    className="mt-1 h-5 w-5 shrink-0 accent-gold-500"
                  />
                ) : null}
                <div className="min-w-0 flex-1">{primaryCol.render(row)}</div>
              </div>

              {detailCols.length > 0 ? (
                <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-cream-100 pt-3">
                  {detailCols.map((col) => (
                    <div key={col.key} className="min-w-0">
                      <dt className="text-[0.625rem] uppercase tracking-wider text-muted">
                        {col.header || '–'}
                      </dt>
                      <dd className="mt-0.5">{col.render(row)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {actionsCol ? (
                <div className="mt-3 border-t border-cream-100 pt-3">{actionsCol.render(row)}</div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
