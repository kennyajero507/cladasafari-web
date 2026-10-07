'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Modal } from './Modal';

/**
 * Replaces window.confirm for destructive admin actions.
 *
 * The native dialog is unstyled, cannot name the item being destroyed in any
 * readable way, and, on the enquiries page, opened on top of an already-open
 * modal. This reuses the focus-trapping Modal, so Escape, tab containment and
 * focus restoration all behave.
 */

interface ConfirmOptions {
  title: string;
  /** Shown under the title. Naming the item is what makes this a real check. */
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive styling on the confirm button. */
  destructive?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/**
 * Returns [confirm, dialog]. `confirm` resolves true when accepted, so callers
 * read almost identically to the window.confirm they replace:
 *
 *   if (!(await confirm({ title: 'Delete this tour?' }))) return;
 */
export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  // Held in a ref too, so settle() never closes over a stale render.
  const pendingRef = useRef<PendingConfirm | null>(null);

  const settle = useCallback((ok: boolean) => {
    pendingRef.current?.resolve(ok);
    pendingRef.current = null;
    setPending(null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    // A second request while one is open cancels the first rather than
    // orphaning its promise.
    pendingRef.current?.resolve(false);

    return new Promise<boolean>((resolve) => {
      const next = { ...options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const dialog = pending ? (
    <Modal label={pending.title} onClose={() => settle(false)} className="max-w-md">
      <h2 className="text-xl">{pending.title}</h2>
      {pending.body ? <div className="mt-3 text-sm text-muted">{pending.body}</div> : null}

      <div className="mt-7 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => settle(false)}
          className="rounded-full border border-cream-300 px-5 py-2.5 text-sm transition-colors hover:border-gold-500"
        >
          {pending.cancelLabel ?? 'Cancel'}
        </button>
        <button
          type="button"
          onClick={() => settle(true)}
          className={`rounded-full px-6 py-2.5 text-sm font-medium transition-colors ${
            pending.destructive === false
              ? 'bg-gold-500 text-charcoal-950 hover:bg-gold-400'
              : 'bg-maroon-600 text-white hover:bg-maroon-700'
          }`}
        >
          {pending.confirmLabel ?? 'Delete'}
        </button>
      </div>
    </Modal>
  ) : null;

  return [confirm, dialog];
}
