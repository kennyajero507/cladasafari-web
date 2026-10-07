import Image from 'next/image';
import Link from 'next/link';
import type { Destination } from '@/types';

export function DestinationCard({
  destination,
  size = 'default',
}: {
  destination: Destination;
  size?: 'default' | 'tall';
}) {
  return (
    <Link
      href={`/destinations/${destination.slug}`}
      className={`group relative block overflow-hidden rounded-[2px] ${
        size === 'tall' ? 'aspect-[3/4]' : 'aspect-[4/3]'
      }`}
    >
      <Image
        src={destination.cardImage.url}
        alt={destination.cardImage.alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        className="object-cover transition-transform duration-700 ease-soft group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/95 via-charcoal-950/55 via-45% to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-6">
        <p className="eyebrow mb-1.5 text-gold-300">{destination.categoryLabel ?? destination.country}</p>
        <h3 className="font-display text-2xl text-white">{destination.name}</h3>
        {/* Always two lines tall, so every card's title sits on the same line. */}
        <p className="mt-1.5 line-clamp-2 min-h-[2lh] text-sm text-cream-100/90">{destination.tagline}</p>

        <p className="mt-4 inline-flex items-center gap-2 text-xs text-cream-100/80 transition-colors group-hover:text-gold-400">
          {destination.parkCount} {destination.parkCount === 1 ? 'place' : 'places'}
          {destination.tourCount
            ? ` · ${destination.tourCount} ${destination.tourCount === 1 ? 'package' : 'packages'}`
            : ''}
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </p>
      </div>
    </Link>
  );
}
