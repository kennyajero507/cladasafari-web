'use client';

import { useState } from 'react';
import type { Testimonial } from '@/types';

const PER_PAGE = 8; // two rows of four on desktop

/**
 * Dense grid of short review cards, paged. Sits on the charcoal ground, so
 * the cards are light on dark.
 *
 * Reviews flagged `isSample` are demo content from the seed. They carry a
 * visible "Sample review" label so they are never read as genuine customer
 * feedback; replace them with real reviews in the dashboard.
 */
export function TestimonialCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const [page, setPage] = useState(0);
  if (!testimonials.length) return null;

  const pages = Math.ceil(testimonials.length / PER_PAGE);
  const visible = testimonials.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const go = (next: number) => setPage((next + pages) % pages);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map((t) => (
          <figure
            key={t._id}
            className="flex h-full flex-col rounded-[2px] bg-white/97 p-5 shadow-card backdrop-blur-sm"
          >
            <div className="mb-3 flex gap-0.5" aria-label={`Rated ${t.rating} out of 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <StarIcon key={i} filled={i < t.rating} />
              ))}
            </div>

            <blockquote className="flex-1">
              <p className="line-clamp-6 text-[0.92rem] leading-relaxed text-ink">
                &ldquo;{t.quote}&rdquo;
              </p>
            </blockquote>

            <figcaption className="mt-4 border-t border-cream-200 pt-3">
              <p className="text-sm font-medium text-ink">{t.authorName}</p>
              {t.authorLocation ? (
                <p className="mt-0.5 text-xs text-muted">{t.authorLocation}</p>
              ) : null}
              {t.tourName ? (
                <p className="mt-1.5 line-clamp-1 text-[0.7rem] uppercase tracking-wider text-gold-700">
                  {t.tourName}
                </p>
              ) : null}
              {t.isSample ? (
                <p className="mt-2 inline-block rounded-full bg-cream-200 px-2 py-0.5 text-[0.6rem] uppercase tracking-wider text-muted">
                  Sample review
                </p>
              ) : null}
            </figcaption>
          </figure>
        ))}
      </div>

      {pages > 1 ? (
        <div className="mt-10 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => go(page - 1)}
            aria-label="Previous reviews"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:border-gold-500 hover:text-gold-400"
          >
            ←
          </button>
          <div className="flex gap-2">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                aria-label={`Reviews page ${i + 1} of ${pages}`}
                aria-current={i === page}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === page ? 'w-6 bg-gold-500' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(page + 1)}
            aria-label="Next reviews"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:border-gold-500 hover:text-gold-400"
          >
            →
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-gold-500"
      aria-hidden
    >
      <path d="m12 17.27 5.18 3.13-1.37-5.89 4.56-3.95-6.01-.52L12 4.5 9.64 10.04l-6.01.52 4.56 3.95-1.37 5.89z" />
    </svg>
  );
}
