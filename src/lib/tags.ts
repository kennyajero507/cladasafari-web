/**
 * Cache tag vocabulary shared with the Django API, which POSTs these strings
 * to /api/revalidate after any admin write. Keep in step with the `tags`
 * callbacks on each Resource in apps/{catalog,content}/resources.py.
 */
export const TAGS = {
  home: 'home',
  tours: 'tours',
  tour: (slug: string) => `tour:${slug}`,
  categories: 'categories',
  destinations: 'destinations',
  destination: (slug: string) => `destination:${slug}`,
  blog: 'blog',
  post: (slug: string) => `post:${slug}`,
  testimonials: 'testimonials',
  faqs: 'faqs',
  services: 'services',
  settings: 'settings',
  pages: 'pages',
  page: (slug: string) => `page:${slug}`,
} as const;

/** Public pages revalidate on this cadence even without a webhook. */
export const DEFAULT_REVALIDATE = 300;
