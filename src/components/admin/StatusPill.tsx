const STYLES: Record<string, string> = {
  published: 'bg-leaf-100 text-leaf-700',
  draft: 'bg-cream-200 text-muted',

  // Enquiry pipeline, drawn from the site palette (globals.css): amber for
  // work waiting on us, deepening green as it advances, sand once it is done.
  // Amber on `new` is the only attention-grabbing tone, which is the point:
  // an unclaimed enquiry is the one state that needs someone to move.
  new: 'bg-gold-100 text-gold-700',
  assigned: 'bg-leaf-100 text-leaf-600',
  in_progress: 'bg-leaf-100 text-leaf-700',
  quoted: 'bg-leaf-200 text-charcoal-800',
  won: 'bg-leaf-500 text-cream-50',
  lost: 'bg-cream-200 text-muted',
};

/** Underscored enum values are not presentable; `won`/`lost` need real words. */
const LABELS: Record<string, string> = {
  new: 'New',
  assigned: 'Assigned',
  in_progress: 'In progress',
  quoted: 'Quoted',
  won: 'Booked',
  lost: 'Closed',
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${
        LABELS[status] ? '' : 'capitalize'
      } ${STYLES[status] ?? 'bg-cream-200 text-muted'}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
