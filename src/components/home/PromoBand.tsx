import { ButtonLink } from '@/components/ui/Button';
import { ParallaxSection } from '@/components/ui/ParallaxSection';
import type { SiteSettings } from '@/types';

/** Full-bleed promotional band. Copy, button and photograph come from Site settings. */
export function PromoBand({ promo }: { promo: SiteSettings['promo'] }) {
  if (!promo?.title) return null;

  return (
    // The scrim runs left to right: dark behind the copy (and the balloons in the
    // default photograph), clear on the right so the landscape is not greyed out.
    <ParallaxSection image={promo.image} overlay="side" className="py-16 sm:py-20 md:py-24">
      <div className="container-page">
        <div className="max-w-xl">
          <p className="eyebrow text-gold-300">{promo.eyebrow}</p>
          <h2 className="mt-3 text-[clamp(1.8rem,3.6vw,2.6rem)] leading-tight text-white">{promo.title}</h2>
          <p className="mt-5 text-base leading-relaxed text-cream-50">{promo.body}</p>
          <div className="mt-8">
            <ButtonLink href={promo.cta.href} size="lg">
              {promo.cta.label}
            </ButtonLink>
          </div>
        </div>
      </div>
    </ParallaxSection>
  );
}
