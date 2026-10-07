'use client';

import { ImageUploader } from './ImageUploader';
import type { Park, ApiImage } from '@/types';

/**
 * Parks are embedded documents on a destination, not a collection of their own,
 * so they are edited inline here rather than on separate pages.
 */
export function ParksEditor({
  parks,
  onChange,
}: {
  parks: Park[];
  onChange: (parks: Park[]) => void;
}) {
  function update(index: number, patch: Partial<Park>) {
    onChange(parks.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= parks.length) return;
    const next = [...parks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {parks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-cream-300 px-4 py-8 text-center text-sm text-muted">
          No places yet. Add the parks, cities, islands or beaches within this destination.
        </p>
      ) : null}

      {parks.map((park, i) => (
        <div key={i} className="space-y-3 rounded-lg border border-cream-200 bg-cream-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted">
              Park {i + 1}
            </span>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Move ${park.name || 'place'} up`}
                className="rounded border border-cream-300 px-2 py-1 disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === parks.length - 1}
                aria-label={`Move ${park.name || 'place'} down`}
                className="rounded border border-cream-300 px-2 py-1 disabled:opacity-40"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onChange(parks.filter((_, j) => j !== i))}
                className="text-maroon-600 underline"
              >
                Remove
              </button>
            </div>
          </div>

          <input
            type="text"
            value={park.name}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="Place name, e.g. Maasai Mara or Paris"
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
          />

          <textarea
            rows={2}
            value={park.blurb ?? ''}
            onChange={(e) => update(i, { blurb: e.target.value })}
            placeholder="Short description (max 240 characters)"
            maxLength={240}
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
          />

          <input
            type="text"
            value={park.bestTime ?? ''}
            onChange={(e) => update(i, { bestTime: e.target.value })}
            placeholder="Best time, e.g. July - October"
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
          />

          <textarea
            rows={3}
            value={(park.highlights ?? []).join('\n')}
            onChange={(e) =>
              update(i, {
                highlights: e.target.value
                  .split('\n')
                  .map((l) => l.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Highlights, one per line"
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
          />

          <ImageUploader
            label="Place image"
            value={park.image as ApiImage | undefined}
            onChange={(v) => update(i, { image: v })}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          onChange([...parks, { name: '', blurb: '', bestTime: '', highlights: [] }])
        }
        className="w-full rounded-lg border border-dashed border-cream-300 py-3 text-sm text-leaf-700 transition-colors hover:border-gold-500 hover:text-gold-600"
      >
        + Add place
      </button>
    </div>
  );
}
