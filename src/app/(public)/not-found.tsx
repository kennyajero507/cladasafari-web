import Link from 'next/link';

/**
 * Scoped to the (public) group so notFound() resolves inside this route
 * segment and serves a genuine 404 status, rather than falling through to the
 * root boundary.
 */
export default function PublicNotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center bg-cream-50 px-4 py-32 text-center">
      <p className="mb-4 text-xs uppercase tracking-[0.28em] text-gold-600">404</p>
      <h1 className="mb-4 text-3xl md:text-4xl">This page has moved or never existed</h1>
      <p className="mb-9 max-w-md text-sm leading-relaxed text-muted">
        Try the packages below, or head back to the homepage.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-[3px] bg-gold-500 px-6 text-sm font-medium text-charcoal-950 transition-colors hover:bg-gold-400"
        >
          Back to home
        </Link>
        <Link
          href="/tours"
          className="inline-flex h-11 items-center justify-center rounded-[3px] border border-cream-300 px-6 text-sm text-charcoal-900 transition-colors hover:border-charcoal-900"
        >
          Browse packages
        </Link>
      </div>
    </div>
  );
}
