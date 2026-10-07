import Link from 'next/link';
import type { Category, CmsPage, SiteSettings } from '@/types';
import { telHref, whatsappHref, secondaryNumber } from '@/lib/format';
import { NewsletterForm } from './NewsletterForm';
import { SOCIAL_LABELS, type SocialKey } from '@/components/ui/SocialIcon';

const COMPANY = [
  { href: '/about', label: 'About Us' },
  { href: '/services', label: 'What We Do' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/credits', label: 'Photo credits' },
];

/** Brand and blurb, Explore (top-level package groups only), Company, Get in touch. */
export function Footer({
  settings,
  categories,
  pages = [],
}: {
  settings: SiteSettings;
  categories: Category[];
  /** Published pages ticked "Show in footer" (FAQs, Privacy Policy...), after the fixed links. */
  pages?: CmsPage[];
}) {
  const { contact, socials, newsletter, footerBlurb, notice, brand } = settings;
  const secondNumber = secondaryNumber(contact.phone, contact.whatsapp);
  const year = new Date().getFullYear();
  const activeSocials = Object.entries(socials ?? {}).filter(([, url]) => Boolean(url));

  const company = [
    ...COMPANY,
    ...pages
      .filter((p) => !COMPANY.some((c) => c.href === `/${p.slug}`))
      .map((p) => ({ href: `/${p.slug}`, label: p.seo?.metaTitle || p.title })),
  ];

  // Top-level groups only. The places beneath each are in the header menu and
  // the listing's filters; repeating all of them here made the column a wall of links.
  const explore = [
    ...categories.map((group) => ({ href: `/tours?category=${group.slug}`, label: group.navLabel || group.name })),
    { href: '/air-ticketing', label: 'Air Ticketing' },
    { href: '/tours', label: 'All packages' },
  ];

  return (
    <footer className="bg-charcoal-950 text-[#a9a394]">
      <div className="container-page grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          {/* On a white tile: the logo's brown wordmark does not read on the dark footer. */}
          <span className="mb-5 inline-flex rounded-xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- brand logo, set in Site settings */}
            <img src={brand.logo.url} alt={brand.logo.alt} width={455} height={388} className="h-24 w-auto" />
          </span>
          <p className="max-w-xs text-sm leading-relaxed">{footerBlurb}</p>

          {activeSocials.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {activeSocials.map(([key, url]) => (
                <a
                  key={key}
                  href={url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs transition-colors hover:border-gold-500 hover:text-gold-400"
                >
                  {SOCIAL_LABELS[key as SocialKey] ?? key}
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <h3 className="mb-4 font-sans text-[0.95rem] font-medium text-white">Explore</h3>
          <ul className="space-y-2.5 text-sm">
            {explore.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-gold-400">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-sans text-[0.95rem] font-medium text-white">Company</h3>
          <ul className="space-y-2.5 text-sm">
            {company.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-gold-400">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-sans text-[0.95rem] font-medium text-white">Get in touch</h3>
          <address className="space-y-2.5 text-sm not-italic">
            <p>{[contact.addressLine, contact.city].filter(Boolean).join(', ')}</p>
            <p>
              <a href={`mailto:${contact.email}`} className="break-all transition-colors hover:text-gold-400">
                {contact.email}
              </a>
            </p>
            <p className="space-y-1">
              <a href={`tel:${telHref(contact.phone)}`} className="block transition-colors hover:text-gold-400">
                {contact.phone}
              </a>
              {secondNumber ? (
                <a href={`tel:${telHref(secondNumber)}`} className="block transition-colors hover:text-gold-400">
                  {secondNumber}
                </a>
              ) : null}
            </p>
            {contact.whatsapp ? (
              <p>
                <a
                  href={whatsappHref(contact.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-gold-400"
                >
                  Message us on WhatsApp
                </a>
              </p>
            ) : null}
          </address>

          <h3 className="mb-2 mt-8 font-sans text-[0.95rem] font-medium text-white">{newsletter.heading}</h3>
          <p className="mb-3 text-sm leading-relaxed">{newsletter.blurb}</p>
          <NewsletterForm />
        </div>
      </div>

      <div className="border-t border-[#34363b]">
        {/* The tall bottom padding lets this line scroll clear of the floating
            WhatsApp and contact buttons, which would otherwise cover it. */}
        <div className="container-page flex flex-col justify-between gap-2.5 pb-24 pt-6 text-[0.82rem] sm:flex-row">
          <p>
            © {year} {brand.name}. All rights reserved.
          </p>
          {notice?.enabled && notice.text ? <p className="text-gold-400/80">{notice.text}</p> : <p>{brand.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
