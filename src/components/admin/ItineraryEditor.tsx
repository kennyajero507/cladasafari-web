'use client';

import { useId, useRef, useState } from 'react';
import type { ItineraryDay } from '@/types';

const MEALS = ['Breakfast', 'Lunch', 'Dinner'] as const;

/**
 * Day-by-day itinerary builder.
 *
 * Previously every day was fully expanded with three inputs distinguished only
 * by placeholder text, which disappears as soon as you type; a fourteen-day
 * itinerary was an enormous scroll, reordering meant clicking ↑ repeatedly, and
 * Remove destroyed a day's work with no way back. Days now collapse to a
 * summary line, drag to reorder, and a removal can be undone.
 */
export function ItineraryEditor({
  days,
  onChange,
}: {
  days: ItineraryDay[];
  onChange: (days: ItineraryDay[]) => void;
}) {
  const baseId = useId();
  // Collapsed by default past a handful of days, so a long itinerary is
  // navigable; a short one stays open and immediately editable.
  const [open, setOpen] = useState<Set<number>>(() => new Set(days.map((_, i) => i)));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const undoRef = useRef<{ day: ItineraryDay; index: number } | null>(null);
  const [undoable, setUndoable] = useState(false);

  function renumber(list: ItineraryDay[]) {
    return list.map((d, i) => ({ ...d, day: i + 1 }));
  }

  function update(index: number, patch: Partial<ItineraryDay>) {
    onChange(days.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function addDay() {
    const index = days.length;
    onChange([
      ...days,
      {
        day: index + 1,
        title: '',
        description: '',
        activities: [],
        meals: [],
        accommodation: '',
      },
    ]);
    // A day you just added should be open and ready to type into.
    setOpen((s) => new Set(s).add(index));
  }

  function removeDay(index: number) {
    undoRef.current = { day: days[index], index };
    setUndoable(true);
    onChange(renumber(days.filter((_, i) => i !== index)));
    setOpen((s) => {
      const next = new Set<number>();
      for (const i of s) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      }
      return next;
    });
  }

  function undoRemove() {
    const saved = undoRef.current;
    if (!saved) return;
    const next = [...days];
    next.splice(Math.min(saved.index, next.length), 0, saved.day);
    onChange(renumber(next));
    undoRef.current = null;
    setUndoable(false);
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= days.length) return;
    const next = [...days];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(renumber(next));
  }

  function moveTo(from: number, to: number) {
    if (from === to || to < 0 || to >= days.length) return;
    const next = [...days];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(renumber(next));
  }

  function toggle(index: number) {
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {days.length === 0 ? (
        <p className="rounded-lg border border-dashed border-cream-300 px-4 py-8 text-center text-sm text-muted">
          No itinerary days yet. Add the first day below.
        </p>
      ) : null}

      {days.length > 1 ? (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <button
            type="button"
            onClick={() => setOpen(new Set(days.map((_, i) => i)))}
            className="underline hover:text-ink"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setOpen(new Set())}
            className="underline hover:text-ink"
          >
            Collapse all
          </button>
          <span className="ml-auto">Drag a day by its handle to reorder.</span>
        </div>
      ) : null}

      {days.map((day, i) => {
        const isOpen = open.has(i);
        const panelId = `${baseId}-day-${i}`;

        return (
          <div
            key={i}
            onDragOver={(e) => {
              if (dragIndex === null) return;
              e.preventDefault();
              setOverIndex(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) moveTo(dragIndex, i);
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={`rounded-lg border bg-cream-50 transition-colors ${
              overIndex === i && dragIndex !== null && dragIndex !== i
                ? 'border-gold-500 bg-gold-50'
                : 'border-cream-200'
            } ${dragIndex === i ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-3 p-3">
              <span
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                aria-hidden="true"
                title="Drag to reorder"
                className="cursor-grab select-none px-1 text-muted active:cursor-grabbing"
              >
                ⠿
              </span>

              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-100 text-sm text-gold-700">
                {day.day}
              </span>

              {/* The whole summary row toggles, so a long itinerary can be
                  skimmed by title rather than scrolled through in full. */}
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-sm font-medium">
                  {day.title || <span className="text-muted">Untitled day</span>}
                </span>
                {!isOpen && day.accommodation ? (
                  <span className="block truncate text-xs text-muted">{day.accommodation}</span>
                ) : null}
              </button>

              <div className="flex shrink-0 items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move day ${day.day} earlier`}
                  className="h-8 w-8 rounded border border-cream-300 disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === days.length - 1}
                  aria-label={`Move day ${day.day} later`}
                  className="h-8 w-8 rounded border border-cream-300 disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeDay(i)}
                  aria-label={`Remove day ${day.day}`}
                  title="Remove this day"
                  className="h-8 w-8 rounded text-maroon-600 hover:bg-maroon-600/10"
                >
                  ✕
                </button>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  aria-label={isOpen ? `Collapse day ${day.day}` : `Expand day ${day.day}`}
                  className="h-8 w-8 rounded border border-cream-300"
                >
                  {isOpen ? '⌃' : '⌄'}
                </button>
              </div>
            </div>

            {isOpen ? (
              <div id={panelId} className="space-y-3 border-t border-cream-200 p-4">
                <div>
                  <label
                    htmlFor={`${panelId}-title`}
                    className="mb-1 block text-xs font-medium text-ink"
                  >
                    Day title
                  </label>
                  <input
                    id={`${panelId}-title`}
                    type="text"
                    value={day.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    placeholder="e.g. Nairobi to the Maasai Mara"
                    className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${panelId}-description`}
                    className="mb-1 block text-xs font-medium text-ink"
                  >
                    Description
                  </label>
                  <textarea
                    id={`${panelId}-description`}
                    rows={2}
                    value={day.description ?? ''}
                    onChange={(e) => update(i, { description: e.target.value })}
                    placeholder="What happens on this day"
                    className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${panelId}-activities`}
                    className="mb-1 block text-xs font-medium text-ink"
                  >
                    Activities
                  </label>
                  <textarea
                    id={`${panelId}-activities`}
                    rows={3}
                    value={(day.activities ?? []).join('\n')}
                    onChange={(e) =>
                      update(i, {
                        activities: e.target.value.split('\n'),
                      })
                    }
                    onBlur={(e) =>
                      update(i, {
                        activities: e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="One per line"
                    className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-muted">One per line.</p>
                </div>

                <div className="flex flex-wrap items-end gap-4">
                  <fieldset>
                    <legend className="mb-1 block text-xs font-medium text-ink">
                      Meals included
                    </legend>
                    <div className="flex items-center gap-3">
                      {MEALS.map((meal) => (
                        <label key={meal} className="flex cursor-pointer items-center gap-1.5 text-xs">
                          <input
                            type="checkbox"
                            checked={(day.meals ?? []).includes(meal)}
                            onChange={(e) =>
                              update(i, {
                                meals: e.target.checked
                                  ? [...(day.meals ?? []), meal]
                                  : (day.meals ?? []).filter((m) => m !== meal),
                              })
                            }
                            className="h-3.5 w-3.5 accent-gold-500"
                          />
                          {meal}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={`${panelId}-accommodation`}
                      className="mb-1 block text-xs font-medium text-ink"
                    >
                      Accommodation
                    </label>
                    <input
                      id={`${panelId}-accommodation`}
                      type="text"
                      value={day.accommodation ?? ''}
                      onChange={(e) => update(i, { accommodation: e.target.value })}
                      placeholder="Where the night is spent"
                      className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {undoable ? (
        <div className="flex items-center gap-3 rounded-lg border border-cream-300 bg-white px-4 py-2.5 text-sm">
          <span className="text-muted">Day removed.</span>
          <button
            type="button"
            onClick={undoRemove}
            className="font-medium text-charcoal-800 underline hover:text-gold-600"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => {
              undoRef.current = null;
              setUndoable(false);
            }}
            aria-label="Dismiss"
            className="ml-auto text-muted hover:text-ink"
          >
            ×
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={addDay}
        className="w-full rounded-lg border border-dashed border-cream-300 py-3 text-sm text-leaf-700 transition-colors hover:border-gold-500 hover:text-gold-600"
      >
        + Add day {days.length + 1}
      </button>
    </div>
  );
}
