import Image from 'next/image';
import { FaqAccordion } from '@/components/ui/Accordion';
import { ButtonLink } from '@/components/ui/Button';
import { Markdown } from '@/components/ui/Markdown';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { apiListSafe } from '@/lib/api';
import { TAGS } from '@/lib/tags';
import type {
  CardsSection,
  CtaSection,
  Faq,
  FaqSection,
  ImageTextSection,
  PageSection,
  TextSection,
} from '@/types';

/**
 * The blocks an editable page is built from, in the order the editor arranged
 * them. Each block keeps to the site's existing section styles, so a page
 * assembled in the dashboard looks like the hand-built ones around it.
 * Unknown block types (from a newer API) are skipped rather than crashing.
 */
export function PageSections({ sections }: { sections: PageSection[] }) {
  return (
    <>
      {sections.map((section, i) => {
        const key = section.id || `${section.type}-${i}`;
        switch (section.type) {
          case 'text':
            return <TextBlock key={key} section={section} />;
          case 'imageText':
            return <ImageTextBlock key={key} section={section} priority={i === 0} />;
          case 'cards':
            return <CardsBlock key={key} section={section} />;
          case 'faq':
            return <FaqListBlock key={key} section={section} />;
          case 'cta':
            return <CtaBlock key={key} section={section} />;
          default:
            return null;
        }
      })}
    </>
  );
}

function Eyebrow({ text, tone = 'light' }: { text?: string; tone?: 'light' | 'dark' }) {
  if (!text) return null;
  return <p className={`mb-3 text-[0.85rem] font-medium ${tone === 'dark' ? 'text-gold-400' : 'text-gold-600'}`}>{text}</p>;
}

function TextBlock({ section }: { section: TextSection }) {
  return (
    <section className="bg-cream-50 py-14 md:py-20">
      <div className="container-page max-w-3xl">
        <Eyebrow text={section.eyebrow} />
        {section.heading ? <h2 className="mb-6 text-3xl leading-tight md:text-4xl">{section.heading}</h2> : null}
        <Markdown content={section.body} />
      </div>
    </section>
  );
}

function ImageTextBlock({ section, priority }: { section: ImageTextSection; priority: boolean }) {
  const images = section.images.slice(0, 2);
  const left = section.imageSide === 'left';

  return (
    <section className="bg-cream-100 py-16 md:py-24">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2">
        <div className={left ? 'lg:order-2' : undefined}>
          <Eyebrow text={section.eyebrow} />
          {section.heading ? <h2 className="mb-6 text-3xl leading-tight md:text-4xl">{section.heading}</h2> : null}
          {section.body ? (
            <div className="space-y-5">
              <Markdown content={section.body} />
            </div>
          ) : null}
        </div>

        {images.length ? (
          <div className={`grid gap-4 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} ${left ? 'lg:order-1' : ''}`}>
            {images.map((image, i) => (
              <div
                key={image.url}
                className={`relative overflow-hidden rounded-[2px] ${images.length > 1 ? 'aspect-[3/4]' : 'aspect-[4/3]'} ${i === 1 ? 'mt-10' : ''}`}
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  priority={priority && i === 0}
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CardsBlock({ section }: { section: CardsSection }) {
  const dark = section.tone === 'dark';
  const columns = section.items.length >= 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3';

  return (
    <section className={`${dark ? 'bg-charcoal-900' : 'bg-white'} py-16 md:py-24`}>
      <div className="container-page">
        {section.heading ? (
          <SectionHeading eyebrow={section.eyebrow || undefined} title={section.heading} tone={dark ? 'light' : 'dark'} />
        ) : null}
        <div className={`grid grid-cols-1 gap-6 ${columns}`}>
          {section.items.map((item, i) => (
            <Reveal key={`${item.title}-${i}`} delay={i * 80}>
              <article
                className={`flex h-full flex-col rounded-[2px] border p-7 ${
                  dark ? 'border-[#3a3c42] bg-charcoal-800' : 'border-cream-300 bg-cream-50'
                }`}
              >
                {item.eyebrow ? (
                  <p className={`mb-2 text-[0.72rem] uppercase tracking-[0.08em] ${dark ? 'text-gold-400' : 'text-gold-700'}`}>
                    {item.eyebrow}
                  </p>
                ) : dark ? null : (
                  <span aria-hidden className="mb-4 block font-display text-3xl text-gold-500">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                )}
                <h3 className={`mb-3 ${dark ? 'text-xl text-white' : 'text-lg'}`}>{item.title}</h3>
                {item.body ? (
                  <p className={`flex-1 text-sm leading-relaxed ${dark ? 'text-[#a9a394]' : 'text-muted'}`}>{item.body}</p>
                ) : (
                  <span className="flex-1" />
                )}
                {item.href ? (
                  <ButtonLink
                    href={item.href}
                    variant={dark ? 'outline-gold' : 'outline'}
                    size="sm"
                    className="mt-6 self-start"
                  >
                    {item.linkLabel || 'Find out more →'}
                  </ButtonLink>
                ) : null}
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

async function FaqListBlock({ section }: { section: FaqSection }) {
  const query = new URLSearchParams({ limit: '100' });
  if (section.group) query.set('group', section.group);
  const { items } = await apiListSafe<Faq>(`/api/faqs?${query}`, { tags: [TAGS.faqs] });
  if (!items.length) return null;

  return (
    <section className="bg-cream-50 py-12 sm:py-16 md:py-24">
      <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:h-fit">
          <p className="eyebrow mb-3 text-gold-700">{section.eyebrow || 'FAQ'}</p>
          <h2 className="text-3xl leading-[1.15] md:text-[2.6rem]">{section.heading || 'Frequently asked questions'}</h2>
        </div>
        <FaqAccordion faqs={items} />
      </div>
    </section>
  );
}

function CtaBlock({ section }: { section: CtaSection }) {
  const dark = section.tone === 'dark';

  return (
    <section className={`${dark ? 'bg-charcoal-950' : 'bg-cream-100'} py-16 md:py-20`}>
      <div className="container-page text-center">
        {section.eyebrow ? <p className="eyebrow mb-3 text-gold-500">{section.eyebrow}</p> : null}
        <h2 className={`mx-auto max-w-2xl text-3xl ${dark ? 'text-white' : ''}`}>{section.heading}</h2>
        {section.body ? (
          <p className={`mx-auto mt-4 max-w-xl text-sm leading-relaxed ${dark ? 'text-[#b8b2a0]' : 'text-muted'}`}>
            {section.body}
          </p>
        ) : null}
        <div className="mt-8">
          <ButtonLink href={section.ctaHref} size="lg">
            {section.ctaLabel}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
