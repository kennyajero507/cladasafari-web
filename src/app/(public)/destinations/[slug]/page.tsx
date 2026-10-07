import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { PageBanner } from '@/components/ui/PageBanner';
import { PackageCard } from '@/components/tours/PackageCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';

import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { apiGet, apiListSafe, ApiRequestError } from '@/lib/api';
import { whatsappHref, whatsappNumber } from '@/lib/format';
import { getSettings } from '@/lib/settings';
import { TAGS } from '@/lib/tags';
import type { Destination, Tour } from '@/types';

type Params = Promise<{ slug: string }>;

async function getDestination(slug: string): Promise<Destination | null> {
  try {
    return await apiGet<Destination>(`/api/destinations/${slug}`, {
      tags: [TAGS.destination(slug), TAGS.destinations],
    });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const destination = await getDestination(slug);
  // Here rather than only in the page: the page renders inside the (public)
  // loading.tsx boundary, so by then a 200 has already been streamed.
  if (!destination) notFound();

  return {
    title: destination.seo?.metaTitle ?? `${destination.name}: packages and places`,
    description: destination.seo?.metaDescription ?? destination.overview.slice(0, 180),
    openGraph: {
      title: destination.name,
      description: destination.tagline ?? destination.overview.slice(0, 180),
      images: [{ url: destination.seo?.ogImage ?? destination.heroImage.url }],
    },
  };
}

export default async function DestinationDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const destination = await getDestination(slug);
  if (!destination) notFound();

  const [{ items: tours }, settings] = await Promise.all([
    apiListSafe<Tour>(`/api/tours?destination=${encodeURIComponent(destination.slug)}&limit=8`, {
      tags: [TAGS.tours],
    }),
    getSettings(),
  ]);
  const whatsapp = whatsappNumber(settings);

  return (
    <>
      <PageBanner
        title={destination.name}
        eyebrow={destination.regionLabel}
        subtitle={destination.tagline}
        image={destination.heroImage}
        height="tall"
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/destinations', label: 'Destinations' },
          { href: `/destinations/${destination.slug}`, label: destination.name },
        ]}
      />

      <section className="bg-cream-50 py-16 md:py-20">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="mb-5 text-2xl">About {destination.name}</h2>
            <p className="text-base leading-relaxed text-muted">{destination.overview}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={`/tours?destination=${destination.slug}`}>
                {destination.name} packages
              </ButtonLink>
              <ButtonLink href="/contact" variant="ghost">
                Ask us about {destination.name} →
              </ButtonLink>
              {whatsapp ? (
                <a
                  href={whatsappHref(whatsapp, `Hi, I would like to plan a trip to ${destination.name}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#25D366] px-5 py-2.5 text-sm font-medium text-[#128C7E] transition-colors hover:bg-[#25D366] hover:text-white"
                >
                  <WhatsAppIcon size={16} />
                  Chat on WhatsApp
                  <span className="sr-only">(opens WhatsApp in a new tab)</span>
                </a>
              ) : null}
            </div>
          </div>

          <aside className="space-y-5">
            {destination.highlights?.length ? (
              <div className="rounded-[2px] border border-cream-200 bg-white p-6">
                <h3 className="mb-4 text-base">Highlights</h3>
                <ul className="space-y-2.5">
                  {destination.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted">
                      <span aria-hidden className="mt-0.5 text-gold-500">
                        ✦
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {destination.bestTime?.months?.length ? (
              <div className="rounded-[2px] bg-charcoal-900 p-6 text-cream-100">
                <h3 className="mb-3 text-base text-cream-50">Best time to visit</h3>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {destination.bestTime.months.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-charcoal-800 px-2.5 py-1 text-xs text-gold-400"
                    >
                      {m.slice(0, 3)}
                    </span>
                  ))}
                </div>
                {destination.bestTime.note ? (
                  <p className="text-sm leading-relaxed text-cream-200/75">
                    {destination.bestTime.note}
                  </p>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      {destination.parks?.length ? (
        <section className="bg-white py-16 md:py-24">
          <div className="container-page">
            <SectionHeading
              eyebrow="Places"
              title={`Where to go in ${destination.name}`}
              description="Each with its own character and best season."
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {destination.parks.map((park, i) => (
                <Reveal key={park.slug ?? park.name} delay={i * 70}>
                  <article
                    id={park.slug}
                    className="group flex h-full flex-col overflow-hidden rounded-[2px] border border-cream-200 bg-white transition-all duration-500 ease-soft hover:-translate-y-1 hover:shadow-card"
                  >
                    {park.image?.url ? (
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                          src={park.image.url}
                          alt={park.image.alt}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-700 ease-soft group-hover:scale-105"
                        />
                      </div>
                    ) : null}

                    <div className="flex flex-1 flex-col p-5">
                      <p className="mb-1.5 text-[0.65rem] uppercase tracking-[0.2em] text-gold-600">
                        {park.kind || destination.country}
                      </p>
                      <h3 className="mb-2 text-lg leading-snug">{park.name}</h3>
                      {park.blurb ? (
                        <p className="mb-4 flex-1 text-sm leading-relaxed text-muted">{park.blurb}</p>
                      ) : null}

                      {park.highlights?.length ? (
                        <ul className="mb-4 space-y-1">
                          {park.highlights.map((h) => (
                            <li key={h} className="flex items-start gap-2 text-xs text-muted">
                              <span aria-hidden className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gold-500" />
                              {h}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <div className="mt-auto flex items-center justify-between border-t border-cream-200 pt-4">
                        {park.bestTime ? (
                          <p className="text-xs text-muted">
                            <span className="block text-[0.6rem] uppercase tracking-wider">Best time</span>
                            <span className="text-ink">{park.bestTime}</span>
                          </p>
                        ) : (
                          <span />
                        )}
                        <ButtonLink
                          href={`/tours?destination=${destination.slug}`}
                          size="sm"
                          variant="secondary"
                        >
                          Packages
                        </ButtonLink>
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {tours.length > 0 ? (
        <section className="bg-cream-100 py-16 md:py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="Packages"
              title={`Trips to ${destination.name}`}
              align="left"
              action={
                <ButtonLink
                  href={`/tours?destination=${destination.slug}`}
                  variant="ghost"
                >
                  View all →
                </ButtonLink>
              }
            />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {tours.map((tour) => (
                <PackageCard key={tour._id} tour={tour} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
