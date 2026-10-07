'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Row-level actions.
 *
 * These used to be three ~11px underlined links sitting a few pixels apart, one
 * of which changed what was live on the public site and another of which
 * deleted the row. Same-looking targets, well under the 44px touch minimum.
 * Each action is now a bounded control, visually grouped, with the destructive
 * one separated and coloured differently.
 */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-start gap-1.5 sm:justify-end">{children}</div>
  );
}

/** Outline trash can, sized to sit beside the xs button labels. */
export function TrashIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 5v6m4-6v6" />
    </svg>
  );
}

const BASE =
  'inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs transition-colors disabled:opacity-50';

export function RowButton({
  onClick,
  disabled = false,
  destructive = false,
  title,
  icon,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  /** Tooltip; also the accessible name when the label is hidden on mobile. */
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${BASE} ${
        destructive
          ? 'text-maroon-600 hover:bg-maroon-600/10'
          : 'border border-cream-300 text-charcoal-800 hover:border-gold-500 hover:bg-cream-50'
      }`}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </button>
  );
}

export function RowLink({
  href,
  title,
  icon,
  children,
}: {
  href: string;
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      title={title}
      className={`${BASE} border border-cream-300 text-charcoal-800 hover:border-gold-500 hover:bg-cream-50`}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </Link>
  );
}
