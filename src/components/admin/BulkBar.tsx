'use client';

import type { ReactNode } from 'react';

/**
 * Appears once rows are selected. Publishing twelve tours used to mean twelve
 * click-confirm-wait cycles; archiving a month of spam enquiries was worse.
 */
export function BulkBar({
  count,
  onClear,
  busy = false,
  children,
}: {
  count: number;
  onClear: () => void;
  busy?: boolean;
  /** The actions themselves; use <BulkButton>. */
  children: ReactNode;
}) {
  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="sticky top-16 z-10 flex flex-wrap items-center gap-3 rounded-card border border-gold-400 bg-gold-50 px-4 py-3 lg:top-0"
    >
      <p className="text-sm font-medium text-charcoal-950">
        {count} selected
      </p>

      <div className="flex flex-wrap items-center gap-2">{children}</div>

      <button
        type="button"
        onClick={onClear}
        disabled={busy}
        className="ml-auto text-xs text-muted underline hover:text-ink disabled:opacity-50"
      >
        Clear selection
      </button>
    </div>
  );
}

export function BulkButton({
  onClick,
  disabled = false,
  destructive = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-9 rounded-full px-4 text-xs font-medium transition-colors disabled:opacity-50 ${
        destructive
          ? 'border border-maroon-600 text-maroon-700 hover:bg-maroon-600 hover:text-white'
          : 'border border-gold-500 text-gold-700 hover:bg-gold-500 hover:text-charcoal-950'
      }`}
    >
      {children}
    </button>
  );
}
