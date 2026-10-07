import Image from 'next/image';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { telHref } from '@/lib/format';
import type { SiteSettings } from '@/types';

/**
 * Narrative on the left, a 2x2 photo grid on the right with one company value
 * over each photograph. Values and their photographs are edited in Site
 * settings, so nothing here is hardcoded.
 */
export function WhyUs({
  values,
  about,
  phone,
}: {
  values: SiteSettings['values'];
  about: SiteSettings['about'];
  phone: string;
}) {
  const cards = (values ?? []).filter((v) => v.image?.url).slice(0, 4);
  if (!cards.length) return null;

  // The opening line and the closing "how we plan" paragraph. The middle
  // paragraphs walk through the product lines, which the page has just shown.
  const { paragraphs } = about;
  const intro = paragraphs.length > 2 ? [paragraphs[0], paragraphs[paragraphs.length - 1]] : paragraphs;

  return (
    <section className="bg-white py-16 md:py-24">
      {/* Copy is centred against the photo grid rather than pinned to its top, so no empty column is left below it. */}
      <div className="container-page grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
        <div>
          <p className="eyebrow mb-3 text-gold-700">Why Clada Safari Bliss</p>
          <h2 className="text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight">{about.heading}</h2>

          <div className="mt-6 space-y-4 leading-relaxed text-muted">
            {intro.map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/about" variant="secondary">
              About us
            </ButtonLink>
            <ButtonLink href={`tel:${telHref(phone)}`} variant="ghost">
              {phone}
            </ButtonLink>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {cards.map((card, i) => (
            <Reveal key={card.title} delay={i * 80}>
              <article className="group relative aspect-[3/4] overflow-hidden rounded-[2px] sm:aspect-[4/5]">
                <Image
                  src={card.image!.url}
                  alt={card.image!.alt}
                  fill
                  sizes="(max-width: 1024px) 50vw, 28vw"
                  className="object-cover transition-transform duration-700 ease-soft group-hover:scale-105"
                />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-charcoal-950/92 via-charcoal-950/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <h3 className="text-base text-white sm:text-lg">{card.title}</h3>
                  {/* Fixed at three lines so the four titles share a baseline. */}
                  <p className="mt-1.5 line-clamp-3 min-h-[3lh] text-[0.78rem] leading-relaxed text-cream-100/90 sm:text-[0.82rem]">
                    {card.description}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
