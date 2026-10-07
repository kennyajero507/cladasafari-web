'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { ApiImage } from '@/types';

/**
 * Crossfading hero backgrounds, rotating on a timer with no visible controls.
 *
 * The first slide loads with `priority` so it stays the LCP element; the rest
 * load lazily. Rotation stops under prefers-reduced-motion and pauses while
 * the tab is hidden.
 */
export function HeroSlideshow({ slides, intervalMs = 5200 }: { slides: ApiImage[]; intervalMs?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      stop();
      timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [slides.length, intervalMs]);

  return (
    <>
      {slides.map((slide, i) => (
        <Image
          key={slide.url}
          src={slide.url}
          alt={i === 0 ? slide.alt : ''}
          aria-hidden={i !== 0}
          fill
          priority={i === 0}
          sizes="100vw"
          className={`object-cover transition-opacity duration-[1400ms] ease-soft motion-reduce:transition-none ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
    </>
  );
}
