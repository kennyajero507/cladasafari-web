import { SectionHeading } from '@/components/ui/SectionHeading';

/**
 * Embedded film, shown only once an administrator has set a YouTube video ID
 * in Site settings. There is no public placeholder: an empty frame promising a
 * film is worse than no section, and borrowed footage would misrepresent whose
 * trips the viewer is watching.
 */
export function VideoSection({ youtubeId }: { youtubeId?: string }) {
  if (!youtubeId) return null;

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container-page">
        <SectionHeading eyebrow="Watch" title="See where we travel" align="center" />
        <div className="mx-auto max-w-4xl overflow-hidden rounded-[2px] bg-charcoal-950 shadow-card">
          <div className="relative aspect-video">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
              title="Clada Safari Bliss film"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
