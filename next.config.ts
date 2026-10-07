import type { NextConfig } from 'next';

type UploadHost = { protocol: 'http' | 'https'; hostname: string; port: string };

/**
 * Admin-uploaded media is served by the Django API, so its host has to be
 * allowed here or <Image> refuses to render it. The API answers on two paths:
 *
 *   /uploads/**      when it has a host of its own (localhost:8001, api.cladasafaribliss.com)
 *   /api/uploads/**  when it is mounted under /api on the site's domain (cPanel/DirectAdmin)
 *
 * Both are allowed for every host, so a move between the two layouts needs no
 * change here.
 */
const UPLOAD_PATHS = ['/uploads/**', '/api/uploads/**'];

const UPLOAD_HOSTS: UploadHost[] = [
  // Local development: 8001 is this project's API port; 8000 is Django's default.
  { protocol: 'http', hostname: 'localhost', port: '8001' },
  { protocol: 'http', hostname: '127.0.0.1', port: '8001' },
  { protocol: 'http', hostname: 'localhost', port: '8000' },
  { protocol: 'http', hostname: '127.0.0.1', port: '8000' },
  // Production.
  { protocol: 'https', hostname: 'cladasafaribliss.com', port: '' },
  { protocol: 'https', hostname: 'www.cladasafaribliss.com', port: '' },
  { protocol: 'https', hostname: 'api.cladasafaribliss.com', port: '' },
];

function uploadPatterns() {
  const hosts = [...UPLOAD_HOSTS];

  // Whatever the API URLs point at is allowed too, so a staging domain works
  // from its environment alone.
  for (const apiUrl of [process.env.NEXT_PUBLIC_API_URL, process.env.API_INTERNAL_URL]) {
    if (!apiUrl) continue;
    try {
      const { protocol, hostname, port } = new URL(apiUrl);
      const scheme = protocol.replace(':', '');
      if (scheme !== 'http' && scheme !== 'https') continue;
      if (!hosts.some((h) => h.protocol === scheme && h.hostname === hostname && h.port === port)) {
        hosts.push({ protocol: scheme, hostname, port });
      }
    } catch {
      // A malformed API URL should not break the build; the fetch layer
      // surfaces that problem far more clearly than a config crash would.
    }
  }

  return hosts.flatMap((host) => UPLOAD_PATHS.map((pathname) => ({ ...host, pathname })));
}

/**
 * /backend/* is proxied to the API (API_INTERNAL_URL). Pointing
 * NEXT_PUBLIC_API_URL at https://<site>/backend makes the browser talk to the
 * API on the site's own origin, so the admin cookie belongs to the site and the
 * middleware can see it. Needed when the site and API share no parent domain.
 */
async function rewrites() {
  const target = process.env.API_INTERNAL_URL?.replace(/\/+$/, '');
  return target ? [{ source: '/backend/:path*', destination: `${target}/:path*` }] : [];
}

/**
 * Addresses from the previous WordPress site, so links and search results that
 * point at it still land on the same package or listing.
 */
async function redirects() {
  // Listing terms on the old site that are not in its menu and have no category here.
  const safariTerms = ['kenya-safaris', 'luxury-safaris', 'midrange-safaris', 'budget-safaris', 'safari-sort-by-destination'];
  const residentTerms = ['amboseli', 'tsavo', 'samburu', 'maasai-mara'].map((place) => `${place}-kenyanon-residents`);

  return [
    { source: '/tour/:slug', destination: '/tours/:slug', permanent: true },
    ...safariTerms.map((term) => ({
      source: `/ba_locations/${term}`,
      destination: '/tours?category=safari-packages',
      permanent: true,
    })),
    ...residentTerms.map((term) => ({
      source: `/ba_locations/${term}`,
      destination: '/tours?category=kenyanon-residents',
      permanent: true,
    })),
    { source: '/ba_locations/:slug', destination: '/tours?category=:slug', permanent: true },
    { source: '/about-us', destination: '/about', permanent: true },
    { source: '/contact-us', destination: '/contact', permanent: true },
    // The old "Air Ticketing" menu item pointed at a page called faqs-page.
    { source: '/faqs-page', destination: '/air-ticketing', permanent: true },
  ];
}

/*
 * deploy.sh sets BUILD_SINGLE_THREAD=1 on CloudLinux hosting, where an account
 * is capped on processes and memory (LVE limits) and the default build, one
 * worker per CPU core the server reports, is killed part-way through. One
 * worker, no worker threads, is slower but stays inside the cap.
 */
const singleThread = process.env.BUILD_SINGLE_THREAD === '1';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: uploadPatterns(),
    formats: ['image/avif', 'image/webp'],
  },
  poweredByHeader: false,
  rewrites,
  redirects,
  ...(singleThread
    ? {
        experimental: { cpus: 1, workerThreads: false },
        // Linting is CI's job; on the server it only costs memory.
        eslint: { ignoreDuringBuilds: true },
      }
    : {}),
};

export default nextConfig;
