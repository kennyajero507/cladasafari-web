import { formatDate } from '@/lib/format';
import type { EnquiryEvent, EnquiryEventType } from '@/types';

/**
 * The activity log for one enquiry, newest first.
 *
 * A marker per entry type carries most of the meaning at a glance: an admin
 * scanning a long history is usually looking for "when did we last speak to
 * them", not reading every line.
 */
const MARKERS: Record<EnquiryEventType, { glyph: string; tone: string; label: string }> = {
  created: { glyph: '✉', tone: 'bg-cream-200 text-muted', label: 'Received' },
  status_change: { glyph: '→', tone: 'bg-leaf-100 text-leaf-700', label: 'Status' },
  assigned: { glyph: '👤', tone: 'bg-leaf-100 text-leaf-700', label: 'Assigned' },
  unassigned: { glyph: '↩', tone: 'bg-cream-200 text-muted', label: 'Unassigned' },
  note: { glyph: '✎', tone: 'bg-cream-200 text-ink', label: 'Note' },
  contacted: { glyph: '☎', tone: 'bg-gold-100 text-gold-700', label: 'Contacted' },
};

function timeAgo(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function EnquiryTimeline({ events }: { events: EnquiryEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted">Nothing has happened yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => {
        const marker = MARKERS[event.type] ?? MARKERS.note;
        return (
          <li key={event._id} className="flex gap-3">
            <span
              aria-hidden
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${marker.tone}`}
            >
              {marker.glyph}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">
                <span className="sr-only">{marker.label}: </span>
                {event.summary}
              </p>
              {event.note ? (
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-cream-50 p-2.5 text-sm leading-relaxed text-ink">
                  {event.note}
                </p>
              ) : null}
              <p className="mt-0.5 text-xs text-muted">
                <time dateTime={event.createdAt} title={formatDate(event.createdAt)}>
                  {timeAgo(event.createdAt)}
                </time>
                {event.actorName ? ` · ${event.actorName}` : null}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
