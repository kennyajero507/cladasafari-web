'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { telHref, secondaryNumber } from '@/lib/format';
import { SocialIcon, type SocialKey } from '@/components/ui/SocialIcon';
import type { ApiImage, SiteSettings } from '@/types';

export interface NavItem {
  href: string;
  label: string;
  /** Query fragment that marks this item active on /tours, e.g. "category=safaris". */
  match?: string;
  /** Dropdown links; a thumbnail, when set, is decorative beside the label. */
  items?: Array<{ href: string; label: string; image?: { url: string } }>;
}

/*
 * The menu arrives as one list. These routes are the "main pages" of the top
 * bar; everything else (the package groups and Air Ticketing) belongs to the
 * category bar beneath it.
 */
const PAGE_ROUTES = new Set(['/', '/about', '/contact']);

/* The networks the header shows, in order. "x" is the settings key for Twitter. */
const HEADER_SOCIALS: Array<{ key: SocialKey; label: string }> = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'x', label: 'Twitter' },
  { key: 'youtube', label: 'YouTube' },
];

/**
 * The Clada Safari Bliss header, in the two tiers of its previous site:
 *
 *   white top bar     logo · HOME / ABOUT US / CONTACT US · contact widget and socials
 *   olive-brown bar   LOCAL / GETAWAYS / INTERNATIONAL / SAFARI PACKAGES / AIR TICKETING
 *
 * Below `lg` both collapse into one bar with a hamburger drawer. It is fixed
 * and 8rem tall on desktop, which the page banners already leave room for.
 * Public navigation only; /admin is deliberately absent and must stay that way.
 */
export function Header({
  nav,
  phone,
  whatsapp,
  logo,
  socials,
}: {
  nav: NavItem[];
  phone: string;
  whatsapp?: string;
  logo: ApiImage;
  /** From Site settings. An icon is shown for each of Facebook, Twitter and YouTube that has a link. */
  socials?: SiteSettings['socials'];
}) {
  const secondNumber = secondaryNumber(phone, whatsapp);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const pathname = usePathname();
  // Read through QuerySync so static pages need no Suspense around the whole bar.
  const [query, setQuery] = useState('');
  const navRef = useRef<HTMLElement>(null);

  const pages = nav.filter((item) => !item.items && PAGE_ROUTES.has(item.href));
  const categories = nav.filter((item) => !pages.includes(item));
  const socialLinks = HEADER_SOCIALS.filter(({ key }) => Boolean(socials?.[key])).map((s) => ({
    ...s,
    url: socials![s.key] as string,
  }));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMenu(null);
  }, [pathname, query]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close the dropdown on outside click or Escape.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const isActive = (item: NavItem) => {
    if (item.href === '/') return pathname === '/';
    if (item.match) return pathname === '/tours' && query.includes(item.match);
    const base = item.href.split('?')[0];
    return pathname.startsWith(base) && !nav.some((n) => n.match && query.includes(n.match));
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-shadow duration-300 ${
        scrolled || open ? 'shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)]' : ''
      }`}
    >
      <Suspense fallback={null}>
        <QuerySync onChange={setQuery} />
      </Suspense>

      {/* ---------- top bar ---------- */}
      <div className="bg-white">
        <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
          <Link href="/" className="flex shrink-0 items-center" aria-label="Clada Safari Bliss, home">
            {/* eslint-disable-next-line @next/next/no-img-element -- brand logo, set in Site settings */}
            <img src={logo.url} alt={logo.alt} width={455} height={388} className="h-12 w-auto lg:h-[4.25rem]" />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex xl:gap-10" aria-label="Main pages">
            {pages.map((item, index) => {
              const active = isActive(item);
              return (
                <Link
                  key={`${index}-${item.label}`}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`text-[0.84rem] font-bold uppercase tracking-[0.08em] transition-colors duration-300 ${
                    active ? 'text-gold-600' : 'text-charcoal-950 hover:text-gold-600'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-3 lg:gap-6">
            {/* Contact widget: the round chat icon, a label and the number to call. */}
            <a
              href={`tel:${telHref(phone)}`}
              aria-label={`Contact us: call ${phone}`}
              title={secondNumber ? `${phone} or ${secondNumber}` : phone}
              className="group flex items-center gap-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#5c4711]/25 text-[#5c4711] transition-colors duration-300 group-hover:border-[#5c4711] group-hover:bg-[#5c4711] group-hover:text-white lg:h-11 lg:w-11">
                <ChatIcon />
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">Contact Us</span>
                <span className="block text-[0.95rem] font-bold text-charcoal-950 transition-colors duration-300 group-hover:text-gold-600">
                  {telHref(phone)}
                </span>
              </span>
            </a>

            {socialLinks.length > 0 ? (
              <ul className="hidden items-center gap-1 border-l border-cream-300 pl-5 lg:flex">
                {socialLinks.map(({ key, label, url }) => (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-charcoal-950 transition-colors duration-300 hover:text-gold-600"
                    >
                      <SocialIcon name={key} className="h-[0.95rem] w-[0.95rem]" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="flex h-10 w-10 items-center justify-center rounded-full text-charcoal-950 transition-colors hover:bg-cream-100 lg:hidden"
            >
              <span className="relative block h-4 w-5">
                <span className={`absolute left-0 block h-0.5 w-5 bg-current transition-all duration-300 ${open ? 'top-2 rotate-45' : 'top-0'}`} />
                <span className={`absolute left-0 top-2 block h-0.5 w-5 bg-current transition-opacity duration-300 ${open ? 'opacity-0' : 'opacity-100'}`} />
                <span className={`absolute left-0 block h-0.5 w-5 bg-current transition-all duration-300 ${open ? 'top-2 -rotate-45' : 'top-4'}`} />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------- category bar ---------- */}
      <nav
        ref={navRef}
        aria-label="Packages"
        className="hidden border-t border-dashed border-[#735917] bg-[#5c4711] lg:block"
      >
        <div className="container-page flex h-12 items-center justify-center gap-2 xl:gap-6">
          {categories.map((item, index) => {
            const active = isActive(item);
            // Labels and links are admin-arranged, so neither is guaranteed unique.
            const key = `${index}-${item.label}`;
            const text = `text-[0.82rem] font-semibold uppercase tracking-[0.08em] transition-colors duration-300 ${
              active ? 'text-gold-300' : 'text-white hover:text-gold-300'
            }`;

            if (!item.items) {
              return (
                <Link key={key} href={item.href} aria-current={active ? 'page' : undefined} className={`px-3 py-3.5 ${text}`}>
                  {item.label}
                </Link>
              );
            }

            const isOpen = menu === key;
            return (
              <div key={key} className="relative" onMouseEnter={() => setMenu(key)} onMouseLeave={() => setMenu(null)}>
                {/* The name links to everything in the group, as on the previous
                    site; the chevron opens the list for keyboard and touch. */}
                <span className={`flex items-center ${text}`}>
                  <Link href={item.href} aria-current={active ? 'page' : undefined} className="py-3.5 pl-3 pr-1">
                    {item.label}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMenu(isOpen ? null : key)}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    aria-label={`${item.label} menu`}
                    className="py-3.5 pl-1 pr-3"
                  >
                    <Chevron open={isOpen} />
                  </button>
                </span>

                <div hidden={!isOpen} className="absolute left-0 top-full min-w-56">
                  <ul className="overflow-hidden rounded-b-md border-t-2 border-gold-400 bg-white py-2 shadow-[0_16px_34px_rgba(0,0,0,0.22)]">
                    {item.items.map((sub, i) => (
                      <li key={`${i}-${sub.href}`}>
                        <Link
                          href={sub.href}
                          className="flex items-center gap-3 px-5 py-2.5 text-[0.88rem] text-ink transition-colors duration-300 hover:bg-cream-50 hover:text-gold-600"
                        >
                          {sub.image ? (
                            <Image
                              src={sub.image.url}
                              alt=""
                              width={40}
                              height={40}
                              className="h-10 w-10 shrink-0 rounded-md object-cover"
                            />
                          ) : null}
                          {sub.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* ---------- mobile drawer: main pages, then the package groups ---------- */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="max-h-[calc(100svh-4rem)] overflow-y-auto border-t border-dashed border-[#735917] bg-[#5c4711] lg:hidden"
      >
        <nav className="container-page flex flex-col py-3" aria-label="Mobile">
          {[...pages, ...categories].map((item, index) => (
            <div key={`${index}-${item.label}`} className="border-b border-white/10 last:border-0">
              <Link
                href={item.href}
                className="block py-3.5 text-[0.84rem] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:text-gold-300"
              >
                {item.label}
              </Link>
              {item.items?.length ? (
                <ul className="-mt-1 mb-3.5 flex flex-wrap gap-2">
                  {item.items.map((sub, i) => (
                    <li key={`${i}-${sub.href}`}>
                      <Link
                        href={sub.href}
                        className="block rounded-full bg-white/10 px-3 py-1.5 text-xs text-cream-100 transition-colors hover:bg-gold-400 hover:text-charcoal-950"
                      >
                        {sub.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pb-2">
            <div className="flex flex-col gap-1.5">
              {[phone, secondNumber].filter(Boolean).map((number) => (
                <a
                  key={number}
                  href={`tel:${telHref(number as string)}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gold-300"
                >
                  <ChatIcon />
                  {number}
                </a>
              ))}
            </div>
            {socialLinks.length > 0 ? (
              <ul className="flex items-center gap-1">
                {socialLinks.map(({ key, label, url }) => (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:text-gold-300"
                    >
                      <SocialIcon name={key} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </nav>
      </div>
    </header>
  );
}

/** Reports the current query string, for highlighting the active product line. */
function QuerySync({ onChange }: { onChange: (query: string) => void }) {
  const params = useSearchParams();
  useEffect(() => onChange(params.toString()), [params, onChange]);
  return null;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden
      className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.7 8.7 0 0 1-3.9-.9L3 20.5l1.7-4.9a8.1 8.1 0 0 1-1.2-4.1A8.4 8.4 0 0 1 12 3.2a8.4 8.4 0 0 1 9 8.3Z" />
      <path d="M8.5 11.5h.01M12.2 11.5h.01M15.9 11.5h.01" />
    </svg>
  );
}
