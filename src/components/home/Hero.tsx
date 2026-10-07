import { ButtonLink } from '@/components/ui/Button';
import { HeroSlideshow } from './HeroSlideshow';
import { SocialIcon, activeSocials } from '@/components/ui/SocialIcon';
import type { SiteSettings } from '@/types';

/**
 * The original site's hero: a crossfading photograph with copy weighted to
 * the bottom left, an outlined tag above the heading, and a green solid plus
 * gold outline button pair. Every word and every slide comes from Site
 * settings, so the hero is fully content-managed.
 */
export function Hero({
  hero,
  slides,
  socials,
}: {
  hero: SiteSettings['hero'];
  slides: SiteSettings['heroSlides'];
  socials?: SiteSettings['socials'];
}) {
  const images = slides?.length ? slides : [hero.backgroundImage];
  const links = activeSocials(socials);

  return (
    <section className="relative flex min-h-[88svh] items-end overflow-hidden pb-24 pt-36 md:min-h-[92vh] md:pb-32">
      <HeroSlideshow slides={images} />

      {/* The original's scrim: heavy at the foot where the copy sits, lighter mid-frame, dark again under the menu. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(0deg,rgba(20,18,14,0.8)_10%,rgba(20,18,14,0.2)_55%,rgba(20,18,14,0.55)_100%)]"
      />

      <div className="container-page relative z-10">
        <div className="max-w-2xl">
          {hero.eyebrow ? (
            <p className="mb-5 inline-block rounded-full border border-white/50 px-4 py-2 text-[0.82rem] text-cream-100">
              {hero.eyebrow}
            </p>
          ) : null}

          <h1 className="text-[clamp(2.2rem,5.2vw,3.7rem)] leading-[1.08] text-white">{hero.title}</h1>

          <p className="mt-5 max-w-lg text-[1.05rem] leading-relaxed text-[#e4ded0]">{hero.subtitle}</p>

          <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:flex-wrap">
            <ButtonLink href={hero.primaryCta.href} variant="secondary" size="lg">
              {hero.primaryCta.label}
            </ButtonLink>
            <ButtonLink href={hero.secondaryCta.href} variant="outline-gold" size="lg">
              {hero.secondaryCta.label}
            </ButtonLink>
          </div>
        </div>
      </div>

      {/* Vertical social rail, pinned to the right edge and centred on the frame. */}
      {links.length > 0 ? (
        <ul className="absolute right-5 top-1/2 z-10 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex lg:right-8">
          <li aria-hidden className="mb-1 h-14 w-px bg-white/40" />
          {links.map(({ key, url, label }) => (
            <li key={key}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-black/20 text-white backdrop-blur-sm transition-colors hover:border-gold-500 hover:bg-gold-500 hover:text-charcoal-950"
              >
                <SocialIcon name={key} />
              </a>
            </li>
          ))}
          <li aria-hidden className="mt-1 h-14 w-px bg-white/40" />
        </ul>
      ) : null}
    </section>
  );
}
