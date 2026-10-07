import { Fragment } from 'react';
import { Hero } from '@/components/home/Hero';
import { CredentialsStrip } from '@/components/home/CredentialsStrip';
import { CategorySection } from '@/components/home/CategorySection';
import { WhyUs } from '@/components/home/WhyUs';
import { VideoSection } from '@/components/home/VideoSection';
import { CountriesGrid } from '@/components/home/CountriesGrid';
import { PromoBand } from '@/components/home/PromoBand';
import { TestimonialCarousel } from '@/components/home/TestimonialCarousel';
import { FaqBlock } from '@/components/home/FaqBlock';
import { BlogCard } from '@/components/blog/BlogCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { ParallaxSection } from '@/components/ui/ParallaxSection';

import { apiListSafe } from '@/lib/api';
import { getSettings } from '@/lib/settings';
import { getCategories } from '@/lib/catalog';
import { TAGS } from '@/lib/tags';
import type { Tour, Destination, Testimonial, Faq, BlogPost } from '@/types';

/* Section headings, keyed by category slug, where the homepage wants more than
   the menu's one-word name. Anything not listed uses the category name. */
const SECTION_TITLES: Record<string, string> = {
  local: 'Local Packages',
  getaways: 'Weekend Getaways',
  international: 'International Packages',
};

/* International sits on the dark block, to break up the run of cream sections. */
const DARK_SECTIONS = new Set(['international']);

/* How many packages each group shows before "View all". */
const PER_SECTION = 8;

export default async function HomePage() {
  const [settings, categories, destinations, testimonials, faqs, posts] = await Promise.all([
    getSettings(),
    getCategories(),
    apiListSafe<Destination>('/api/destinations?featured=true&limit=5', { tags: [TAGS.destinations, TAGS.home] }),
    apiListSafe<Testimonial>('/api/testimonials?limit=8', { tags: [TAGS.testimonials, TAGS.home] }),
    apiListSafe<Faq>('/api/faqs?limit=6', { tags: [TAGS.faqs, TAGS.home] }),
    apiListSafe<BlogPost>('/api/blog?limit=3', { tags: [TAGS.blog, TAGS.home] }),
  ]);

  // One request per top-level group, in the order the menu shows them. Each is
  // a single grid of that group's packages: no sub-heading per place or country.
  const lines = await Promise.all(
    categories.map((group) =>
      apiListSafe<Tour>(`/api/tours?category=${group.slug}&limit=${PER_SECTION}`, { tags: [TAGS.tours, TAGS.home] }).then(
        ({ items }) => ({ group, tours: items })
      )
    )
  );

  return (
    <>
      <Hero hero={settings.hero} slides={settings.heroSlides} socials={settings.socials} />
      <CredentialsStrip />

      {/* Why Clada Safari Bliss follows the first group, so the reasons to book
          come before the remaining sets of cards rather than after all of them. */}
      {lines.map(({ group, tours }, i) => (
        <Fragment key={group.slug}>
          <CategorySection
            id={group.slug}
            group={group}
            tours={tours}
            title={SECTION_TITLES[group.slug]}
            tone={DARK_SECTIONS.has(group.slug) ? 'dark' : 'light'}
          />
          {i === 0 ? <WhyUs values={settings.values} about={settings.about} phone={settings.contact.phone} /> : null}
        </Fragment>
      ))}
      {lines.length === 0 ? (
        <WhyUs values={settings.values} about={settings.about} phone={settings.contact.phone} />
      ) : null}
      <VideoSection youtubeId={settings.video?.youtubeId} />
      <CountriesGrid
        destinations={destinations.items}
        eyebrow={settings.home.destinationsEyebrow}
        title={settings.home.destinationsTitle}
      />
      <PromoBand promo={settings.promo} />

      {testimonials.items.length > 0 ? (
        // The darkest overlay keeps the photograph behind the white cards
        // rather than competing with them.
        <ParallaxSection image={settings.home.testimonialsImage} overlay="darker" className="py-16 md:py-24">
          <div className="container-page">
            <SectionHeading eyebrow="Traveller stories" title="What travellers say" tone="light" />
            <TestimonialCarousel testimonials={testimonials.items} />
          </div>
        </ParallaxSection>
      ) : null}

      <FaqBlock faqs={faqs.items} />

      {posts.items.length > 0 ? (
        <section className="bg-white py-16 md:py-24">
          <div className="container-page">
            <SectionHeading
              eyebrow="Travel journal"
              title="Planning guides and seasonal notes"
              action={
                <ButtonLink href="/blog" variant="outline">
                  View all posts →
                </ButtonLink>
              }
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {posts.items.map((post, i) => (
                <Reveal key={post._id} delay={i * 90}>
                  <BlogCard post={post} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <ParallaxSection image={settings.home.ctaImage} overlay="darker" className="py-16 md:py-28">
        <div className="container-page text-center">
          <h2 className="mx-auto max-w-2xl text-3xl text-white md:text-4xl">{settings.home.ctaTitle}</h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-balance text-cream-50">{settings.home.ctaBody}</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/contact" size="lg">
              Contact us
            </ButtonLink>
            <ButtonLink href="/tours" variant="outline-light" size="lg">
              Browse all packages
            </ButtonLink>
          </div>
        </div>
      </ParallaxSection>
    </>
  );
}
