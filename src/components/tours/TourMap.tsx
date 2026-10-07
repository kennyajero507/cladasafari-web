/**
 * Region map for the tour.
 *
 * Uses the keyless Google Maps embed, which renders without an API key. For
 * the richer styled embed (custom markers, styling), swap the src for
 * `https://www.google.com/maps/embed/v1/place?key=YOUR_KEY&q=...` and put the
 * key in NEXT_PUBLIC_GOOGLE_MAPS_KEY.
 */
export function TourMap({ query, title }: { query: string; title: string }) {
  if (!query) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-cream-200">
      <iframe
        title={`Map of ${title}`}
        src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=6&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-[280px] w-full border-0 md:h-[320px]"
      />
    </div>
  );
}
