'use client';

import { useEffect } from 'react';

/**
 * Warns before the browser discards unsaved edits.
 *
 * The admin forms are long: a tour carries an itinerary, a gallery and four
 * list fields, and a misclick used to throw all of it away silently.
 *
 * This covers reloads, tab closes and external navigation, which is what
 * beforeunload can intercept. In-app <Link> clicks are handled separately by
 * useNavigationGuard below, since the App Router does not expose a
 * route-change-start hook to cancel.
 */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required by some browsers for the prompt to show at all.
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
}

/**
 * Intercepts clicks on in-app links while a form is dirty and asks first.
 *
 * Capture-phase click interception is the only hook available: next/link
 * navigates on click, and the App Router has no cancellable route-change event.
 */
export function useNavigationGuard(
  dirty: boolean,
  message = 'You have unsaved changes. Leave this page and discard them?'
) {
  useEffect(() => {
    if (!dirty) return;

    const onClick = (e: MouseEvent) => {
      // Let modified clicks (new tab/window) and non-primary buttons through.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const anchor = (e.target as Element | null)?.closest?.('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('/')) return;
      if (anchor.target && anchor.target !== '_self') return;

      // Same page, nothing to lose.
      if (href === window.location.pathname) return;

      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [dirty, message]);
}

/** Both guards together, what the forms actually want. */
export function useUnsavedChangesGuard(dirty: boolean) {
  useUnsavedChanges(dirty);
  useNavigationGuard(dirty);
}
