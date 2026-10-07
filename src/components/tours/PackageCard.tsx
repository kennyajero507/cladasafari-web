import Image from 'next/image';
import Link from 'next/link';
import type { Tour } from '@/types';
import { formatPrice, hasPrice, tourPlace } from '@/lib/format';

/**
 * The package card : photo, an uppercase
 * place line, title, one-line description, and a footer with the "from"
 * price per person and a "View package" link. `tone="dark"` is the variant
 * used inside the charcoal International section.
 */
export function PackageCard({
  tour,
  tone = 'light',
  priority = false,
}: {
  tour: Tour;
  tone?: 'light' | 'dark';
  priority?: boolean;
}) {
  const dark = tone === 'dark';

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-[2px] border transition-all duration-300 ease-soft hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(36,38,42,0.12)] ${
        dark ? 'border-[#3a3c42] bg-charcoal-800' : 'border-[#e6dfc9] bg-white'
      }`}
    >
      {/* Taller than wide enough to suit the portrait photographs most packages have. */}
      <Link href={`/tours/${tour.slug}`} className="relative block h-52 overflow-hidden" tabIndex={-1} aria-hidden>
        <Image
          src={tour.heroImage.url}
          alt=""
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-700 ease-soft group-hover:scale-105"
        />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent from-55% to-black/35" />
        {/* Blank when the package has no stated length. */}
        {tour.durationLabel ? (
          <span className="absolute left-3 top-3 rounded-full bg-charcoal-950/85 px-2.5 py-1 text-[0.75rem] text-cream-50 backdrop-blur-sm">
            {tour.durationLabel}
          </span>
        ) : null}
        {tour.isSample ? (
          <span className="absolute right-3 top-3 rounded-full bg-cream-100/90 px-2.5 py-1 text-[0.62rem] uppercase tracking-wider text-charcoal-900">
            Sample
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col px-5 pb-6 pt-5">
        <p className={`text-[0.72rem] font-medium uppercase tracking-[0.08em] ${dark ? 'text-gold-400' : 'text-leaf-700'}`}>
          {tourPlace(tour)}
        </p>
        {/* Titles reserve two lines so one that wraps does not push its card's copy out of line with the rest of the row. */}
        <h3 className={`mb-2.5 mt-2 line-clamp-2 min-h-[2lh] text-[1.28rem] leading-snug ${dark ? 'text-white' : ''}`}>
          <Link href={`/tours/${tour.slug}`} className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
            {tour.title}
          </Link>
        </h3>
        <p className={`mb-4 line-clamp-3 flex-1 text-[0.92rem] leading-relaxed ${dark ? 'text-[#a9a394]' : 'text-muted'}`}>{tour.summary}</p>

        {/* The basis ("per person") sits under the price: on one line, KSh prices left no room for the link. */}
        <div className={`flex items-end justify-between gap-3 border-t pt-3.5 ${dark ? 'border-[#3a3c42]' : 'border-[#ece5d1]'}`}>
          <p className={`whitespace-nowrap font-display text-[1.1rem] leading-tight ${dark ? 'text-cream-100' : 'text-ink'}`}>
            {hasPrice(tour.priceFrom) ? (
              <span className={`block font-sans text-[0.72rem] font-normal uppercase tracking-wider ${dark ? 'text-[#b8b2a0]' : 'text-muted'}`}>From</span>
            ) : null}
            {formatPrice(tour.priceFrom, tour.currency)}
            {hasPrice(tour.priceFrom) && tour.priceBasis ? (
              <span className={`block font-sans text-[0.78rem] font-normal ${dark ? 'text-[#b8b2a0]' : 'text-muted'}`}>{tour.priceBasis}</span>
            ) : null}
          </p>
          <span className={`shrink-0 whitespace-nowrap text-[0.85rem] font-medium ${dark ? 'text-gold-400' : 'text-leaf-700'}`}>
            View package →
          </span>
        </div>
      </div>
    </article>
  );
}
