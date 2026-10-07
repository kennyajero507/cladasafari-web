import type { MetadataRoute } from 'next';
import { apiListSafe } from '@/lib/api';
import { getPages } from '@/lib/pages';
import type { Tour, Destination, BlogPost } from '@/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';

  const [tours, destinations, posts, pages] = await Promise.all([
    apiListSafe<Tour>('/api/tours?limit=100'),
    apiListSafe<Destination>('/api/destinations?limit=50'),
    apiListSafe<BlogPost>('/api/blog?limit=100'),
    getPages(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/tours`, changeFrequency: 'weekly', priority: 0.9 },
    // The destination and journal indexes are listed only once they have something in them.
    ...(destinations.items.length ? [{ url: `${base}/destinations`, changeFrequency: 'monthly' as const, priority: 0.8 }] : []),
    ...(posts.items.length ? [{ url: `${base}/blog`, changeFrequency: 'weekly' as const, priority: 0.6 }] : []),
    { url: `${base}/services`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/about`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/credits`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/contact`, changeFrequency: 'yearly', priority: 0.5 },
  ];

  return [
    ...staticRoutes,
    // About and Contact are already listed above; other pages live at /<slug>.
    ...pages
      .filter((p) => !['about', 'contact'].includes(p.slug))
      .map((p) => ({
        url: `${base}/${p.slug}`,
        lastModified: new Date(p.updatedAt),
        changeFrequency: 'yearly' as const,
        priority: p.template === 'legal' ? 0.2 : 0.4,
      })),
    ...tours.items.map((t) => ({
      url: `${base}/tours/${t.slug}`,
      lastModified: new Date(t.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...destinations.items.map((d) => ({
      url: `${base}/destinations/${d.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...posts.items.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.publishedAt),
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    })),
  ];
}
