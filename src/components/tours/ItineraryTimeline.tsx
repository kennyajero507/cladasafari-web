import type { ItineraryDay } from '@/types';

/**
 * Numbered markers sit outside the cards on a vertical rail, with a day pill
 * and location chip at the top of each card.
 */
export function ItineraryTimeline({
  days,
  location,
}: {
  days: ItineraryDay[];
  location?: string | null;
}) {
  if (!days?.length) return null;

  return (
    <ol className="relative space-y-4 md:pl-11">
      {/* Continuous rail behind the markers. */}
      <span
        aria-hidden
        className="absolute left-[13px] top-3 hidden h-[calc(100%-1.5rem)] w-px bg-cream-300 md:block"
      />

      {days.map((day) => (
        <li key={day.day} className="relative">
          <span
            aria-hidden
            className="absolute -left-11 top-4 hidden h-7 w-7 items-center justify-center rounded-full bg-charcoal-900 text-xs font-medium text-gold-400 md:flex"
          >
            {day.day}
          </span>

          <article className="rounded-xl border border-cream-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-leaf-50 px-2.5 py-1 text-[0.7rem] font-medium text-leaf-700">
                Day {day.day}
              </span>
              {day.accommodation ? (
                <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-muted">
                  <BedIcon />
                  {day.accommodation}
                </span>
              ) : location ? (
                <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-muted">
                  <PinIcon />
                  {location}
                </span>
              ) : null}
            </div>

            <h3 className="mb-2 font-display text-lg text-charcoal-900">{day.title}</h3>

            {day.description ? (
              <p className="mb-3 text-sm leading-relaxed text-muted">{day.description}</p>
            ) : null}

            {day.activities?.length ? (
              <ul className="space-y-1.5">
                {day.activities.map((activity) => (
                  <li key={activity} className="flex items-start gap-2.5 text-sm text-ink">
                    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold-500" />
                    {activity}
                  </li>
                ))}
              </ul>
            ) : null}

            {day.meals?.length ? (
              <p className="mt-3 border-t border-cream-100 pt-3 text-[0.7rem] text-muted">
                {day.meals.join(' · ')}
              </p>
            ) : null}
          </article>
        </li>
      ))}
    </ol>
  );
}

function BedIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 18v-8h18v8M3 14h18M6 10V7h5v3" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
