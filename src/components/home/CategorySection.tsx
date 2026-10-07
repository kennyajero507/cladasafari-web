import Link from 'next/link';
import { PackageCard } from '@/components/tours/PackageCard';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import type { Category, Tour } from '@/types';

/**
 * One top-level package group on the homepage (Local, Getaways, International,
 * Safari Packages): eyebrow, heading and intro, then a single grid of its
 * package cards.
 *
 * The grid is deliberately one unified block. The places and countries beneath
 * a group (Mombasa, Diani, Kenya, Tanzania…) are not given a sub-heading and a
 * row each: with one or two packages per place that made a column of headings
 * over half-empty rows. They appear instead as a line of quiet links under the
 * intro, and each card names its own place.
 */
export function CategorySection({
  group,
  tours,
  tone = 'light',
  id,
  title,
}: {
  title?: string;
  group: Category;
  tours: Tour[];
  tone?: 'light' | 'dark';
  id?: string;
}) {
  if (!tours.length) return null;
  const dark = tone === 'dark';
  // Places with nothing published yet would lead to an empty listing.
  const places = (group.children ?? []).filter((child) => (child.tourCount ?? 0) > 0);

  return (
    <section id={id} className={`py-16 md:py-24 ${dark ? 'bg-charcoal-900 text-cream-200' : 'bg-cream-100'}`}>
      <div className="container-page">
        <div className="mb-10 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className={`eyebrow ${dark ? 'text-gold-400' : 'text-gold-700'}`}>{group.eyebrow || group.name}</p>
            <h2 className={`mt-2 text-[clamp(1.8rem,3.6vw,2.6rem)] leading-tight ${dark ? 'text-white' : ''}`}>
              {title ?? group.name}
            </h2>
            {group.description ? (
              <p className={`mt-3.5 leading-relaxed ${dark ? 'text-[#b8b2a0]' : 'text-muted'}`}>{group.description}</p>
            ) : null}
            {places.length > 1 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {places.map((place) => (
                  <li key={place.slug}>
                    <Link
                      href={`/tours?category=${place.slug}`}
                      className={`block rounded-full border px-3 py-1 text-[0.8rem] transition-colors ${
                        dark
                          ? 'border-white/20 text-cream-100 hover:border-gold-400 hover:text-gold-400'
                          : 'border-cream-300 bg-white/60 text-ink hover:border-leaf-500 hover:text-leaf-700'
                      }`}
                    >
                      {place.navLabel || place.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <ButtonLink
            href={`/tours?category=${group.slug}`}
            variant={dark ? 'outline-light' : 'outline'}
            className="shrink-0 self-start md:self-auto"
          >
            View all {group.tourCount ? `${group.tourCount} ` : ''}
            {group.kind === 'safari' ? 'safaris' : 'packages'} →
          </ButtonLink>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tours.map((tour, i) => (
            <Reveal key={tour._id} delay={(i % 4) * 70}>
              <PackageCard tour={tour} tone={tone} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
