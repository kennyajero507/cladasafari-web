import { DestinationCard } from '@/components/destinations/DestinationCard';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ButtonLink } from '@/components/ui/Button';
import type { Destination } from '@/types';

/** Featured destinations as evenly sized tall cards. */
export function CountriesGrid({
  destinations,
  eyebrow,
  title,
}: {
  destinations: Destination[];
  eyebrow: string;
  title: string;
}) {
  if (!destinations.length) return null;

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          action={
            <ButtonLink href="/destinations" variant="outline">
              All destinations →
            </ButtonLink>
          }
        />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {destinations.slice(0, 5).map((destination, i) => (
            <Reveal key={destination._id} delay={i * 70} className={i === 4 ? 'col-span-2 lg:col-span-1' : ''}>
              <DestinationCard destination={destination} size="tall" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
