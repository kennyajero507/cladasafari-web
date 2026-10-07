'use client';

import { useEffect, useRef } from 'react';

/**
 * The admin forms are several screens tall and submit from a sticky footer
 * button, so an error banner rendered at the top appeared entirely offscreen,
 * pressing Save looked like it did nothing at all. This scrolls itself into
 * view and moves focus to the first invalid field, which also announces the
 * problem to screen readers.
 */
/** "seo.metaTitle" reads as "Meta title" in the summary line. */
function humanise(name: string): string {
  const leaf = name.split('.').pop() ?? name;
  const spaced = leaf.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function FormError({
  message,
  fieldErrors,
}: {
  message: string;
  /** Keyed by input name, as the API returns them. */
  fieldErrors?: Record<string, string>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const names = fieldErrors ? Object.keys(fieldErrors) : [];
  // Re-runs whenever the message or the specific fields change, so a second
  // failed save scrolls again rather than sitting silently.
  const signature = `${message}|${names.join(',')}`;

  useEffect(() => {
    if (!message) return;

    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Nested keys like "seo.metaTitle" are the input's name attribute verbatim.
    const first = names[0];
    if (!first) return;

    const field = document.querySelector<HTMLElement>(
      `[name="${CSS.escape(first)}"], #${CSS.escape(first)}`
    );
    // Let the scroll settle before stealing focus, or the browser jumps twice.
    if (field) setTimeout(() => field.focus({ preventScroll: true }), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (!message) return null;

  const count = names.length;

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="rounded-lg border border-maroon-600/30 bg-maroon-600/10 px-4 py-3 text-sm text-maroon-700"
    >
      <p className="font-medium">{message}</p>
      {count > 0 ? (
        <p className="mt-1 text-xs">
          {count} {count === 1 ? 'field needs' : 'fields need'} attention:{' '}
          {names.map((name, i) => (
            <span key={name}>
              {i > 0 ? ', ' : ''}
              <button
                type="button"
                onClick={() => {
                  const el = document.querySelector<HTMLElement>(
                    `[name="${CSS.escape(name)}"], #${CSS.escape(name)}`
                  );
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el?.focus({ preventScroll: true });
                }}
                className="underline underline-offset-2 hover:no-underline"
              >
                {humanise(name)}
              </button>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
