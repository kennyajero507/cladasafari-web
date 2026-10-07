import type { ReactNode } from 'react';

/**
 * Full-bleed photographic background that stays fixed while content scrolls
 * over it.
 *
 * `bg-fixed` is ignored or janky on iOS Safari and some Android browsers, so
 * the image is also set as a normal cover background, so the section still looks
 * right there, it simply scrolls with the page. Under prefers-reduced-motion
 * the fixed attachment is disabled in globals.css.
 *
 * Overlays are gradients rather than flat scrims: heavier at the top where
 * headings sit, lighter through the middle so the photograph stays visible.
 */
export function ParallaxSection({
  image,
  overlay = 'dark',
  className = '',
  children,
}: {
  image: { url: string; alt?: string };
  overlay?: 'light' | 'dark' | 'darker' | 'side';
  className?: string;
  children: ReactNode;
}) {
  const overlays = {
    light: 'bg-gradient-to-b from-charcoal-950/45 via-charcoal-950/20 to-charcoal-950/40',
    dark: 'bg-gradient-to-b from-charcoal-950/58 via-charcoal-950/32 to-charcoal-950/52',
    darker: 'bg-gradient-to-b from-charcoal-950/70 via-charcoal-950/45 to-charcoal-950/65',
    // For left-aligned copy: heavy behind the text, nearly clear on the far side.
    side: 'bg-gradient-to-r from-charcoal-950/85 via-charcoal-950/50 via-45% to-charcoal-950/5',
  };

  return (
    <section
      className={`parallax-section relative bg-cover bg-center bg-no-repeat ${className}`}
      style={{ backgroundImage: `url(${image.url})` }}
    >
      {/* Decorative: the photograph carries no information the copy does not. */}
      <div aria-hidden className={`absolute inset-0 ${overlays[overlay]}`} />
      <div className="relative z-10">{children}</div>
    </section>
  );
}
