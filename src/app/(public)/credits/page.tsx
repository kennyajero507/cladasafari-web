import type { Metadata } from 'next';
import Image from 'next/image';
import { PageBanner } from '@/components/ui/PageBanner';
import { apiListSafe } from '@/lib/api';
import { getSettings } from '@/lib/settings';
import type { MediaAsset } from '@/types';

export const metadata: Metadata = {
  title: 'Photo credits',
  description: 'Where the photographs on the Clada Safari Bliss website come from.',
};

/**
 * Every image in the media library, with its source. Read from the API, so
 * uploads and credit corrections made in the dashboard appear here.
 */
export default async function CreditsPage() {
  const [{ items }, settings] = await Promise.all([
    apiListSafe<MediaAsset>('/api/media?limit=100&sort=title-asc', { revalidate: 3600 }),
    getSettings(),
  ]);
  const photos = items.filter((a) => !a.tags.includes('brand'));
  const banner = settings.pages.credits;
  const groups: Array<{ key: MediaAsset['source']; title: string; note: string }> = [
    {
      key: 'original',
      title: 'From the Clada Safari Bliss website',
      note: 'Photographs carried over from the company’s previous website. No photographer or licence was recorded there.',
    },
    {
      key: 'pexels',
      title: 'Pexels',
      note:
        'Stock photographs used under the Pexels License, chosen to match each destination. They are not photographs of Clada Safari Bliss trips or guests.',
    },
    { key: 'upload', title: 'Uploaded', note: 'Images added through the dashboard.' },
  ];

  return (
    <>
      <PageBanner
        title={banner.title}
        subtitle={banner.subtitle}
        image={banner.image}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/credits', label: 'Photo credits' },
        ]}
      />

      <section className="bg-cream-100 py-14 md:py-20">
        <div className="container-page space-y-14">
          {groups.map((group) => {
            const list = photos.filter((p) => p.source === group.key);
            if (!list.length) return null;
            return (
              <div key={group.key}>
                <h2 className="text-2xl">{group.title}</h2>
                <p className="mb-6 mt-2 max-w-2xl text-sm text-muted">{group.note}</p>
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {list.map((photo) => (
                    <li key={photo.id} className="overflow-hidden rounded-[2px] border border-[#e6dfc9] bg-white">
                      <div className="relative aspect-[4/3]">
                        <Image src={photo.url} alt={photo.alt} fill sizes="(max-width: 640px) 50vw, 20vw" className="object-cover" />
                      </div>
                      <div className="p-3 text-[0.72rem] leading-snug">
                        <p className="line-clamp-2 text-ink">{photo.alt}</p>
                        <p className="mt-1 text-muted">
                          {photo.sourceUrl ? (
                            <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-leaf-700">
                              {photo.credit || 'Source'}
                            </a>
                          ) : (
                            photo.credit || photo.license
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
