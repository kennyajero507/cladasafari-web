import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The admin dashboard is unlinked from the public site and must stay out of indexes.
      disallow: ['/admin', '/admin/', '/api/'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
