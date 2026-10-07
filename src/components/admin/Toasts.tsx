'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Admin-wide transient feedback.
 *
 * Saving a tour used to be confirmed only by the submit button changing back
 * from "Saving…", which after a long form reads as nothing having happened.
 * Destructive and state-changing actions additionally carry an Undo, so a
 * mis-click on "Unpublish" does not require finding the row again.
 */

export type ToastTone = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onAct: () => void | Promise<void>;
}

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  action?: ToastAction;
}

interface ToastInput {
  tone?: ToastTone;
  message: string;
  action?: ToastAction;
  /** Milliseconds before auto-dismiss; 0 keeps it until dismissed. */
  duration?: number;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Errors stay longer than confirmations; an Undo needs time to be noticed. */
function defaultDuration(input: ToastInput): number {
  if (input.duration !== undefined) return input.duration;
  if (input.action) return 9000;
  return input.tone === 'error' ? 7000 : 4000;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      setToasts((list) => [
        ...list,
        { id, tone: input.tone ?? 'success', message: input.message, action: input.action },
      ]);

      const ms = defaultDuration(input);
      if (ms > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), ms)
        );
      }
    },
    [dismiss]
  );

  // Pending timers must not fire against an unmounted tree.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>.');
  return ctx;
}

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-leaf-500 bg-leaf-50 text-leaf-700',
  error: 'border-maroon-600 bg-maroon-700 text-cream-50',
  info: 'border-cream-300 bg-white text-ink',
};

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    /* aria-live rather than role="alert" per toast: the region is announced
       politely as items arrive, without interrupting what is being read. */
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border px-4 py-3 shadow-card ${TONE_STYLES[t.tone]}`}
        >
          <p className="min-w-0 flex-1 text-sm">{t.message}</p>

          {t.action ? (
            <button
              type="button"
              onClick={() => {
                onDismiss(t.id);
                void t.action?.onAct();
              }}
              className="shrink-0 text-sm font-medium underline underline-offset-2 hover:opacity-80"
            >
              {t.action.label}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="shrink-0 text-lg leading-none opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
