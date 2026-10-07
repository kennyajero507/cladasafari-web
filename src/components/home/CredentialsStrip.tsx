/**
 * Sits under the hero. Each line restates something the Clada Safari Bliss
 * website says about the business; deliberately no trade-body logos, licence
 * numbers or "years in business" claims, none of which have been supplied.
 */
const POINTS = [
  'Safaris in Kenya and Tanzania',
  'Kenyan coast holidays',
  'Weekend getaways',
  'International packages',
  'Air ticketing',
];

export function CredentialsStrip() {
  return (
    <section className="border-b border-cream-300/60 bg-cream-50 py-6 md:py-8">
      <div className="container-page">
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:gap-x-12">
          {POINTS.map((item) => (
            // Sentence case with a tick: set in spaced capitals, the row looked
            // like a second menu of links.
            <li key={item} className="flex items-center gap-2 text-[0.9rem] text-ink">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className="shrink-0 text-leaf-500">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
