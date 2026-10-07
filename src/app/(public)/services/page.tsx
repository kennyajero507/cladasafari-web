import type { Metadata } from 'next';
import Image from 'next/image';
import { PageBanner } from '@/components/ui/PageBanner';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiListSafe } from '@/lib/api';
import { getSettings } from '@/lib/settings';
import { TAGS } from '@/lib/tags';
import { telHref } from '@/lib/format';
import type { Service } from '@/types';

export const metadata: Metadata = {
  title: 'What We Do',
  description:
    'Kenyan holiday packages, East African safaris and international holidays, with visas and flights arranged.',
};

/** How a trip comes together; describes the enquiry flow the site actually runs. */
const PROCESS = [
  { title: 'Tell us the plan', body: 'Where you want to go, when, who is travelling and a rough budget.' },
  { title: 'We send options', body: 'A written quote built around your dates, with what is and is not included.' },
  { title: 'Adjust until it fits', body: 'Change the stays, the length or the route until the trip is right.' },
  { title: 'Confirm and travel', body: 'Accept the quote and we make the bookings, visas and flights included where offered.' },
];

export default async function ServicesPage() {
  const [{ items: services }, settings] = await Promise.all([
    apiListSafe<Service>('/api/services?limit=50', { tags: [TAGS.services] }),
    getSettings(),
  ]);
  const banner = settings.pages.services;

  return (
    <>
      <PageBanner
        title={banner.title}
        subtitle={banner.subtitle}
        image={banner.image}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/services', label: 'What We Do' },
        ]}
      />

      <section className="bg-cream-100 py-16 md:py-24">
        <div className="container-page">
          {services.length === 0 ? (
            <EmptyState
              title="Services coming soon"
              message="Tell us about your trip and we will tell you how we can help."
              action={<ButtonLink href="/contact">Get in touch</ButtonLink>}
            />
          ) : (
            <div className="space-y-8">
              {services.map((service, i) => (
                <Reveal key={service._id}>
                  <article className="grid overflow-hidden rounded-[2px] border border-[#e6dfc9] bg-white md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    {service.image ? (
                      <div className={`relative min-h-60 ${i % 2 ? 'md:order-2' : ''}`}>
                        <Image
                          src={service.image.url}
                          alt={service.image.alt}
                          fill
                          sizes="(max-width: 768px) 100vw, 45vw"
                          className="object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="flex flex-col p-7 md:p-10">
                      <span aria-hidden className="mb-3 font-display text-2xl text-gold-500">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h2 className="mb-3 text-2xl">{service.title}</h2>
                      <p className="mb-4 leading-relaxed text-ink">{service.summary}</p>
                      {service.body ? <p className="mb-5 text-sm leading-relaxed text-muted">{service.body}</p> : null}
                      {service.highlights.length ? (
                        <ul className="mb-6 space-y-2">
                          {service.highlights.map((h) => (
                            <li key={h} className="flex items-start gap-2.5 text-sm text-ink">
                              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-500" />
                              {h}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {service.cta ? (
                        <ButtonLink href={service.cta.href} variant="secondary" className="mt-auto self-start">
                          {service.cta.label} →
                        </ButtonLink>
                      ) : null}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="container-page">
          <SectionHeading eyebrow="How it works" title="From enquiry to departure" />
          <ol className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((step, i) => (
              <Reveal key={step.title} delay={i * 80}>
                <li className="h-full rounded-[2px] border border-cream-300 bg-cream-50 p-6">
                  <span
                    aria-hidden
                    className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-gold-500 font-display text-sm text-charcoal-950"
                  >
                    {i + 1}
                  </span>
                  <h3 className="mb-2 text-base">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{step.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-charcoal-950 py-16 md:py-20">
        <div className="container-page text-center">
          <h2 className="mx-auto max-w-2xl text-3xl text-white">Let us plan your next trip</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/contact" size="lg">
              Plan my trip
            </ButtonLink>
            <ButtonLink href={`tel:${telHref(settings.contact.phone)}`} variant="outline-light" size="lg">
              {settings.contact.phone}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
