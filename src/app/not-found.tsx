import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-charcoal-950 px-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo */}
      <img src="/brand/logo.svg" alt="Clada Safari Bliss" width={240} height={110} className="mb-8 h-28 w-auto" />
      <p className="mb-4 text-xs uppercase tracking-[0.28em] text-gold-400">404</p>
      <h1 className="mb-4 text-3xl text-cream-50 md:text-4xl">This page has moved or never existed</h1>
      <p className="mb-9 max-w-md text-sm leading-relaxed text-cream-200/70">
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
          className="inline-flex h-11 items-center justify-center rounded-[3px] border border-white/40 px-6 text-sm text-cream-50 transition-colors hover:bg-white hover:text-charcoal-900"
        >
          Browse packages
        </Link>
      </div>
    </div>
  );
}
