'use client';

import { useEffect, useRef, type ReactNode } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Accessible dialog wrapper.
 *
 * The admin dialogs previously set role="dialog" and aria-modal="true" but
 * implemented none of the behaviour those promise: focus was never moved in,
 * never trapped, never restored, and Escape did nothing, so keyboard and
 * screen-reader users tabbed straight out into the page behind the overlay.
 *
 * `as` lets a caller render the panel as a <form>, which the FAQ and
 * testimonial editors need so their submit buttons still work.
 */
export function Modal({
  label,
  onClose,
  children,
  className = '',
  as = 'div',
  onSubmit,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  as?: 'div' | 'form';
  onSubmit?: (e: React.FormEvent) => void;
}) {
  const panelRef = useRef<HTMLDivElement & HTMLFormElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreTo.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    if (panel) {
      // Prefer the first real control; fall back to the panel itself.
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    }

    // The page behind must not scroll while the dialog is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      restoreTo.current?.focus?.();
    };
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }

    if (e.key !== 'Tab') return;

    const panel = panelRef.current;
    if (!panel) return;

    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const panelProps = {
    ref: panelRef,
    tabIndex: -1,
    className: `max-h-[85vh] w-full overflow-y-auto rounded-card bg-white p-7 focus:outline-none ${className}`,
    ...(as === 'form' ? { onSubmit } : {}),
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onKeyDown={onKeyDown}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      {as === 'form' ? <form {...panelProps}>{children}</form> : <div {...panelProps}>{children}</div>}
    </div>
  );
}
