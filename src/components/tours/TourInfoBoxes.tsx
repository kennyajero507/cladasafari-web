import type { Tour } from '@/types';

/** Up to four small info boxes below the overview heading; a fact the package does not state gets no box. */
export function TourInfoBoxes({ tour }: { tour: Tour }) {
  const boxes = [
    { icon: <ClockIcon />, label: 'Duration', value: tour.durationLabel },
    { icon: <UsersIcon />, label: 'Group size', value: tour.groupSizeMax > 0 ? `Up to ${tour.groupSizeMax}` : '' },
    { icon: <TagIcon />, label: 'Trip type', value: tour.categoryInfo?.group?.name ?? tour.categoryInfo?.name ?? 'Package' },
    {
      icon: <GlobeIcon />,
      label: tour.departsFrom ? 'Starts from' : tour.countries.length > 1 ? 'Countries' : 'Country',
      value: tour.departsFrom || tour.countries.join(', '),
    },
  ].filter((box) => box.value);

  if (!boxes.length) return null;

  return (
    <div className={`grid grid-cols-2 gap-3 ${boxes.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
      {boxes.map((box) => (
        <div
          key={box.label}
          className="flex items-center gap-3 rounded-xl border border-cream-200 bg-white px-4 py-3"
        >
          <span aria-hidden className="text-gold-600">
            {box.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-[0.68rem] uppercase tracking-wider text-muted">
              {box.label}
            </span>
            <span className="block truncate text-sm text-ink">{box.value}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0M16 5.5a3.2 3.2 0 0 1 0 5M18 20a5.5 5.5 0 0 0-2-4" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 12V4h8l9 9-8 8-9-9Z" />
      <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" />
    </svg>
  );
}
