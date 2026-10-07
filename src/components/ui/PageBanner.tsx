import Image from 'next/image';
import Link from 'next/link';
import type { ApiImage } from '@/types';

interface Crumb {
  href: string;
  label: string;
}

interface PageBannerProps {
  title: string;
  subtitle?: string | null;
  eyebrow?: string | null;
  image: ApiImage;
  crumbs?: Crumb[];
  meta?: React.ReactNode;
  height?: 'short' | 'tall';
}

/**
 * Photographic page header. The photograph's credit, when the media library
 * has one, is shown small in the corner, as good practice for stock imagery.
 */
export function PageBanner({ title, subtitle, eyebrow, image, crumbs, meta, height = 'short' }: PageBannerProps) {
  return (
    <section
      className={`relative flex items-end overflow-hidden ${height === 'tall' ? 'min-h-[78vh]' : 'min-h-[60vh]'}`}
    >
      <Image src={image.url} alt={image.alt} fill priority sizes="100vw" className="object-cover" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(0deg,rgba(20,18,14,0.85)_8%,rgba(20,18,14,0.35)_55%,rgba(20,18,14,0.6)_100%)]"
      />

      <div className="container-page relative z-10 pb-14 pt-36">
        {crumbs?.length ? (
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center gap-2 text-xs text-cream-200/75">
              {crumbs.map((crumb, i) => (
                <li key={crumb.href} className="flex items-center gap-2">
                  {i > 0 ? <span aria-hidden>/</span> : null}
                  <Link
                    href={crumb.href}
                    aria-current={i === crumbs.length - 1 ? 'page' : undefined}
                    className="transition-colors hover:text-gold-400"
                  >
                    {crumb.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        {eyebrow ? (
          <p className="mb-4 inline-block rounded-full border border-white/45 px-4 py-1.5 text-[0.78rem] text-cream-100">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="max-w-3xl text-4xl leading-tight text-white md:text-5xl">{title}</h1>

        {subtitle ? <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#e4ded0]">{subtitle}</p> : null}

        {meta ? <div className="mt-7">{meta}</div> : null}
      </div>

      {image.credit ? (
        <p className="absolute bottom-2 right-3 z-10 text-[0.62rem] text-white/55">
          {image.sourceUrl ? (
            <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white/90">
              {image.credit}
            </a>
          ) : (
            image.credit
          )}
        </p>
      ) : null}
    </section>
  );
}
