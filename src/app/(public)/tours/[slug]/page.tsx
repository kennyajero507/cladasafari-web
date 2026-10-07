import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { TourBanner } from '@/components/tours/TourBanner';
import { TourInfoBoxes } from '@/components/tours/TourInfoBoxes';
import { ItineraryTimeline } from '@/components/tours/ItineraryTimeline';
import { InclusionLists } from '@/components/tours/InclusionLists';
import { BookingCard } from '@/components/tours/BookingCard';
import { RelatedTourCard } from '@/components/tours/RelatedTourCard';
import { TourMap } from '@/components/tours/TourMap';
import { Markdown } from '@/components/ui/Markdown';

import { apiGet, apiGetSafe, ApiRequestError } from '@/lib/api';
import { getSettings } from '@/lib/settings';
import { hasPrice, whatsappNumber } from '@/lib/format';
import { TAGS } from '@/lib/tags';
import type { Tour } from '@/types';

type Params = Promise<{ slug: string }>;

async function getTour(slug: string): Promise<Tour | null> {
  try {
    return await apiGet<Tour>(`/api/tours/${slug}`, { tags: [TAGS.tour(slug), TAGS.tours] });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTour(slug);
  // Here rather than only in the page: the page renders inside the (public)
  // loading.tsx boundary, so by then a 200 has already been streamed.
  if (!tour) notFound();

  return {
    title: tour.seo?.metaTitle ?? tour.title,
    description: tour.seo?.metaDescription ?? tour.summary,
    openGraph: {
      title: tour.title,
      description: tour.summary,
      images: [{ url: tour.seo?.ogImage ?? tour.heroImage.url }],
    },
  };
}

/** Small-caps label above each section heading. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[0.68rem] uppercase tracking-[0.2em] text-gold-600">{children}</p>
  );
}

export default async function TourDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const tour = await getTour(slug);
  if (!tour) notFound();

  const [related, settings] = await Promise.all([
    apiGetSafe<Tour[]>(`/api/tours/${slug}/related`, [], { tags: [TAGS.tours] }),
    getSettings(),
  ]);

  const destinationName =
    typeof tour.destination === 'object' && tour.destination ? tour.destination.name : null;
  const mapQuery = tour.parks?.[0] || tour.locationLabel || destinationName || tour.countries?.[0] || 'Kenya';
  const place = tour.locationLabel && tour.locationLabel !== destinationName ? tour.locationLabel : null;

  return (
    <>
      <TourBanner tour={tour} country={[place, destinationName ?? tour.countries.join(' · ')].filter(Boolean).join(', ')} />

      <div className="bg-cream-50 py-14">
        <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,1fr)_370px] lg:gap-12">
          {/* ---------- left column ---------- */}
          <div className="min-w-0 space-y-12">
            {tour.isSample ? (
              <p className="rounded-[2px] border border-gold-300 bg-gold-50 px-4 py-3 text-sm text-charcoal-900">
                <strong className="font-medium">Sample package.</strong> This itinerary was created to
                show the kind of trip we plan; ask us for a quote and we will build the real one around
                your dates.
              </p>
            ) : null}

            <section>
              <Eyebrow>Overview</Eyebrow>
              <h2 className="mb-6 font-display text-2xl text-charcoal-900">About this trip</h2>
              <TourInfoBoxes tour={tour} />
              {/* Paragraphs, with any "What to carry" style list the package has. */}
              {tour.description ? (
                <div className="mt-6 [&_h2]:text-xl [&_li]:text-sm [&_ol]:text-sm [&_p]:text-sm [&_ul]:text-sm">
                  <Markdown content={tour.description} />
                </div>
              ) : null}
              {/* Every destination page this package is listed on, the primary one first. */}
              {tour.destinations?.length ? (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-muted">
                    {tour.destinations.length === 1 ? 'Destination' : 'Destinations'}
                  </span>
                  {tour.destinations.map((d) => (
                    <Link
                      key={d.slug}
                      href={`/destinations/${d.slug}`}
                      className="rounded-full border border-cream-300 bg-white px-3 py-1 text-xs text-charcoal-900 transition-colors hover:border-gold-500"
                    >
                      {d.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>

            {tour.highlights?.length ? (
              <section>
                <Eyebrow>Highlights</Eyebrow>
                <h2 className="mb-5 font-display text-2xl text-charcoal-900">Things to do</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {tour.highlights.map((h) => (
                    <li
                      key={h}
                      className="flex items-start gap-2.5 rounded-[2px] border border-cream-200 bg-white px-4 py-3 text-sm leading-relaxed"
                    >
                      <span aria-hidden className="mt-0.5 shrink-0 text-gold-600">
                        <PinIcon />
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {tour.gallery?.length ? (
              <section>
                <Eyebrow>Gallery</Eyebrow>
                <h2 className="mb-5 font-display text-2xl text-charcoal-900">In pictures</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {tour.gallery.map((image) => (
                    <figure key={image.url} className="relative aspect-[4/5] overflow-hidden rounded-[2px]">
                      <Image
                        src={image.url}
                        alt={image.alt}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover transition-transform duration-700 ease-soft hover:scale-105"
                      />
                      {image.credit ? (
                        <figcaption className="absolute bottom-1 right-2 text-[0.6rem] text-white/70">
                          {image.credit}
                        </figcaption>
                      ) : null}
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}

            {tour.itinerary?.length ? (
              <section>
                <Eyebrow>Itinerary</Eyebrow>
                <h2 className="mb-6 font-display text-2xl text-charcoal-900">Day-by-day journey</h2>
                <ItineraryTimeline days={tour.itinerary} location={destinationName} />
              </section>
            ) : null}

            {tour.inclusions?.length || tour.exclusions?.length ? (
              <section>
                <InclusionLists inclusions={tour.inclusions} exclusions={tour.exclusions} />
              </section>
            ) : null}

            <section>
              <Eyebrow>Booking</Eyebrow>
              <h2 className="mb-4 font-display text-2xl text-charcoal-900">How booking works</h2>
              <div className="space-y-3 text-sm leading-relaxed text-muted">
                <p>
                  Send a request with your dates and group size. We confirm availability and send a
                  written quote; nothing is paid until you accept it.
                </p>
                <p>
                  {hasPrice(tour.priceFrom)
                    ? `The price shown is a starting price${tour.priceBasis ? `, ${tour.priceBasis}` : ''}.`
                    : 'This package is priced on request.'}{' '}
                  Your quote reflects your dates, room type and group size.
                  {tour.visaSupport ? ' Visa application support is included for this trip.' : ''}
                </p>
                <p className="text-xs">
                  Payment and cancellation terms are set out in the written quote before any money
                  changes hands.
                </p>
              </div>
            </section>

            <section>
              <Eyebrow>Where you will travel</Eyebrow>
              <h2 className="mb-5 font-display text-2xl text-charcoal-900">On the map</h2>
              <TourMap query={mapQuery} title={tour.title} />
              {tour.parks?.length ? (
                <p className="mt-3 text-xs text-muted">{tour.parks.join(' · ')}</p>
              ) : null}
            </section>
          </div>

          {/* ---------- sticky booking sidebar ---------- */}
          <aside className="lg:sticky lg:top-28 lg:h-fit">
            <BookingCard
              tourId={tour._id}
              tourTitle={tour.title}
              priceFrom={tour.priceFrom}
              currency={tour.currency}
              phone={settings.contact.phone}
              whatsapp={whatsappNumber(settings)}
              priceBasis={tour.priceBasis}
            />
          </aside>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="bg-white py-14">
          <div className="container-page">
            <h2 className="mb-6 font-display text-2xl text-charcoal-900">You might also like</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {related.map((r) => (
                <RelatedTourCard key={r._id} tour={r} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
