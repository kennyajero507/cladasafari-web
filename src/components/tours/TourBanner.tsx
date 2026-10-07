import Image from 'next/image';
import Link from 'next/link';
import type { Tour } from '@/types';

/** Short banner with a back link, country chip, title and inline icon metadata. */
export function TourBanner({ tour, country }: { tour: Tour; country?: string | null }) {
  // A photograph narrower than a banner would be stretched into a blur with
  // visible blocks. Below 1000px it is used as a soft wash of its own colours
  // behind the title instead, and shown properly in the gallery further down.
  const small = Boolean(tour.heroImage.width && tour.heroImage.width < 1000);

  return (
    <section className="relative flex min-h-[52vh] items-end overflow-hidden md:min-h-[58vh]">
      <Image
        src={tour.heroImage.url}
        alt={small ? '' : tour.heroImage.alt}
        fill
        priority
        sizes={small ? '400px' : '100vw'}
        className={small ? 'scale-125 object-cover blur-2xl' : 'object-cover'}
      />
      <div
        aria-hidden
        className={`absolute inset-0 bg-gradient-to-t ${
          small ? 'from-charcoal-950/90 via-charcoal-950/60 to-charcoal-950/55' : 'from-charcoal-950/90 via-charcoal-950/45 to-charcoal-950/40'
        }`}
      />

      <div className="container-page relative z-10 flex items-end justify-between gap-10 pb-10 pt-32">
        <div className="min-w-0">
          <Link
            href={`/tours?category=${tour.categoryInfo?.group?.slug ?? tour.categoryInfo?.slug ?? tour.category}`}
            className="mb-4 inline-flex items-center gap-2 text-xs text-cream-100/80 transition-colors hover:text-gold-400"
          >
            <span aria-hidden>←</span> {tour.categoryInfo?.group?.name ?? tour.categoryInfo?.name ?? 'All packages'}
          </Link>

          {country ? (
            <p className="mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1 text-[0.7rem] text-cream-50 backdrop-blur-sm">
                <PinIcon />
                {country}
              </span>
            </p>
          ) : null}

          <h1 className="max-w-3xl font-display text-3xl leading-tight text-white md:text-[2.7rem]">
            {tour.title}
          </h1>

          <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.8rem] text-cream-100/85">
            {/* Length and group size are shown only where the package states them. */}
            {tour.durationLabel ? (
              <li className="inline-flex items-center gap-1.5">
                <ClockIcon />
                {tour.durationLabel}
              </li>
            ) : null}
            {tour.groupSizeMax > 0 ? (
              <li className="inline-flex items-center gap-1.5">
                <UsersIcon />
                Up to {tour.groupSizeMax} guests
              </li>
            ) : null}
            {tour.parks?.length ? (
              <li className="inline-flex items-center gap-1.5">
                <TagIcon />
                {tour.parks.slice(0, 3).join(' · ')}
              </li>
            ) : null}
            {/* Ratings only appear once real reviews exist; none are invented. */}
            {tour.reviewCount > 0 ? (
              <li className="inline-flex items-center gap-1.5">
                <span aria-hidden className="text-gold-400">
                  {'★'.repeat(Math.round(tour.rating))}
                </span>
                <span>
                  {tour.rating.toFixed(1)} ({tour.reviewCount})
                </span>
              </li>
            ) : null}
          </ul>
        </div>

        {/* The photograph itself, at a size it is sharp at, beside the title on wide screens. */}
        {small ? (
          <figure className="relative hidden aspect-[4/5] w-56 shrink-0 overflow-hidden rounded-[4px] border border-white/25 shadow-[0_24px_50px_-18px_rgba(0,0,0,0.7)] lg:block xl:w-64">
            <Image src={tour.heroImage.url} alt={tour.heroImage.alt} fill sizes="256px" className="object-cover" />
          </figure>
        ) : null}
      </div>
    </section>
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
function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0M16 5.5a3.2 3.2 0 0 1 0 5M18 20a5.5 5.5 0 0 0-2-4" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 12V4h8l9 9-8 8-9-9Z" />
      <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" />
    </svg>
  );
}
