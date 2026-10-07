import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageBanner } from '@/components/ui/PageBanner';
import { CardGridSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { DestinationCard } from '@/components/destinations/DestinationCard';
import { DestinationFilters } from '@/components/destinations/DestinationFilters';
import { IconicExperiences } from '@/components/destinations/IconicExperiences';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { apiListSafe } from '@/lib/api';
import { getSettings } from '@/lib/settings';
import { TAGS } from '@/lib/tags';
import type { Destination, Region } from '@/types';

export const metadata: Metadata = {
  title: 'Destinations',
  description:
    'The countries Clada Safari Bliss packages and safaris go to.',
};

/**
 * The banner renders straight away and the destination grids stream in behind
 * a skeleton. This was a route-level loading.tsx, which also wrapped
 * /destinations/[slug] and made its 404s answer 200.
 */
export default async function DestinationsPage() {
  const banner = (await getSettings()).pages.destinations;

  return (
    <>
      <PageBanner
        title={banner.title}
        subtitle={banner.subtitle}
        image={banner.image}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/destinations', label: 'Destinations' },
        ]}
      />
      <Suspense fallback={<DestinationsSkeleton />}>
        <DestinationListing />
      </Suspense>
    </>
  );
}

function DestinationsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading destinations" className="container-page py-16">
      <div className="mb-12 flex flex-col items-center gap-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-full max-w-md" />
      </div>
      <CardGridSkeleton count={6} />
    </div>
  );
}

/** Section copy for the regions the business has written about; any other region gets a plain heading. */
const REGION_COPY: Partial<Record<Region, { title: string; description: string }>> = {
  'east-africa': {
    title: 'Safaris and getaways in East Africa',
    description: 'Where our local packages and safaris go, from the coast to the savannah.',
  },
  europe: { title: 'Holidays in Europe', description: 'City breaks and longer holidays in Europe.' },
};

async function DestinationListing() {
  const { items } = await apiListSafe<Destination>('/api/destinations?limit=50', { tags: [TAGS.destinations] });
  const regions = Array.from(new Map(items.map((d) => [d.region, d.regionLabel])).entries());

  return (
    <>
      {items.length === 0 ? (
        <section className="bg-cream-100 py-16">
          <div className="container-page">
            <EmptyState
              title="Destinations coming soon"
              message="Our destination guides are being prepared. In the meantime, tell us where you would like to go."
              action={<ButtonLink href="/contact">Get in touch</ButtonLink>}
            />
          </div>
        </section>
      ) : (
        regions.map(([region, label], r) => (
          <section key={region} className={`py-14 md:py-20 ${r % 2 ? 'bg-charcoal-900' : 'bg-cream-100'}`}>
            <div className="container-page">
              <SectionHeading
                eyebrow={label}
                title={REGION_COPY[region]?.title ?? `Holidays in ${label}`}
                tone={r % 2 ? 'light' : 'dark'}
                description={REGION_COPY[region]?.description}
              />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items
                  .filter((d) => d.region === region)
                  .map((destination, i) => (
                    <Reveal key={destination._id} delay={(i % 3) * 80}>
                      <DestinationCard destination={destination} />
                    </Reveal>
                  ))}
              </div>
            </div>
          </section>
        ))
      )}

      <IconicExperiences destinations={items} />

      {/* Searchable, filterable grid of everywhere we go. */}
      {items.length > 0 ? (
        <section className="bg-cream-50 py-12 sm:py-16 md:py-24">
          <div className="container-page">
            <SectionHeading
              eyebrow="Search"
              title="Find a place"
              description="Filter by region, or search for a park, city or country."
              align="left"
            />
            <DestinationFilters destinations={items} />
          </div>
        </section>
      ) : null}

      <section className="bg-charcoal-950 py-12 sm:py-16 md:py-20">
        <div className="container-page text-center">
          <h2 className="mx-auto max-w-2xl text-3xl text-white">Not sure where to start?</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cream-200/75">
            Tell us your dates, your budget and what you most want to see. We will tell you honestly
            where and when to go.
          </p>
          <div className="mt-8">
            <ButtonLink href="/contact" size="lg">
              Start your journey
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
