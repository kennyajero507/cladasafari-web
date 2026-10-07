import Image from 'next/image';
import Link from 'next/link';
import type { Tour } from '@/types';
import { formatPrice, hasPrice, PRICE_ON_REQUEST, tourPlace } from '@/lib/format';

/** Compact card for the "You might also like" row, lighter than the main TourCard. */
export function RelatedTourCard({ tour }: { tour: Tour }) {
  return (
    <article className="group overflow-hidden rounded-[2px] border border-cream-200 bg-white transition-all duration-500 ease-soft hover:-translate-y-1 hover:shadow-card">
      <Link href={`/tours/${tour.slug}`} className="relative block aspect-[16/10] overflow-hidden">
        <Image
          src={tour.heroImage.url}
          alt={tour.heroImage.alt}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 ease-soft group-hover:scale-105"
        />
        {tour.countries?.length || tour.locationLabel ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-white/95 px-2.5 py-1 text-[0.68rem] text-charcoal-900 backdrop-blur-sm">
            <PinIcon />
            {tourPlace(tour)}
          </span>
        ) : null}
      </Link>

      <div className="p-4">
        <h3 className="mb-1.5 font-display text-[0.95rem] leading-snug">
          <Link href={`/tours/${tour.slug}`} className="transition-colors hover:text-leaf-500">
            {tour.title}
          </Link>
        </h3>
        <p className="mb-3 text-xs text-muted">
          {[tour.durationLabel, hasPrice(tour.priceFrom) ? `from ${formatPrice(tour.priceFrom, tour.currency)}` : PRICE_ON_REQUEST]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <Link
          href={`/tours/${tour.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-leaf-700 transition-colors hover:text-gold-600"
        >
          View trip
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}

function PinIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
