'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminApi } from '@/lib/adminApi';
import type { AdminUser } from '@/lib/auth';

/** Outline icon paths on a 24×24 grid, stroked at the current text colour. */
const ICONS = {
  dashboard: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  enquiries: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z',
  packages: 'M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12',
  destinations: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  services: 'M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM16 21V7M8 21V7',
  blog: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z',
  testimonials: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z',
  categories: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  pages: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M8 13h8M8 17h5',
  faqs: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01',
  media: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM21 15l-5-5L5 21',
  settings: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  roles: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
  audit: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M16 13H8M16 17H8M10 9H8',
  external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  collapse: 'M11 17l-5-5 5-5M18 17l-5-5 5-5',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'M18 6 6 18M6 6l12 12',
} as const;

type IconName = keyof typeof ICONS;

function Icon({ name, className = 'h-[18px] w-[18px]' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  badge?: 'attention';
  /**
   * The permission required to see the entry. Entries without one are shown to
   * everyone who can reach the dashboard at all. Hiding a link is a
   * convenience, not the control: every route is enforced by the API.
   */
  needs?: string;
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true },
      { href: '/admin/enquiries', label: 'Enquiries', icon: 'enquiries', badge: 'attention', needs: 'enquiries.view' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/tours', label: 'Packages', icon: 'packages', needs: 'tours.view' },
      { href: '/admin/destinations', label: 'Destinations', icon: 'destinations', needs: 'destinations.view' },
      { href: '/admin/categories', label: 'Categories', icon: 'categories', needs: 'categories.view' },
      { href: '/admin/services', label: 'Services', icon: 'services', needs: 'services.view' },
      { href: '/admin/blog', label: 'Blog posts', icon: 'blog', needs: 'blog.view' },
      { href: '/admin/testimonials', label: 'Testimonials', icon: 'testimonials', needs: 'testimonials.view' },
      { href: '/admin/faqs', label: 'FAQs', icon: 'faqs', needs: 'faqs.view' },
      { href: '/admin/pages', label: 'Pages', icon: 'pages', needs: 'pages.view' },
      { href: '/admin/media', label: 'Media library', icon: 'media', needs: 'media.view' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/admin/settings', label: 'Site settings', icon: 'settings', exact: true, needs: 'settings.edit' },
      { href: '/admin/settings/navigation', label: 'Navigation menu', icon: 'menu', needs: 'settings.edit' },
      { href: '/admin/users', label: 'Users', icon: 'users', needs: 'users.view' },
      { href: '/admin/roles', label: 'Roles', icon: 'roles', needs: 'users.view' },
      { href: '/admin/audit', label: 'Audit log', icon: 'audit', needs: 'audit.view' },
    ],
  },
];

const COLLAPSED_KEY = 'hb-admin-sidebar-collapsed';

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('') || '?'
  );
}

export function AdminShell({
  admin,
  attentionCount = 0,
  children,
}: {
  admin: AdminUser | null;
  /** Enquiries unassigned or past their follow-up date, work, not unread mail. */
  attentionCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  // The drawer is only a drawer below lg; above it the sidebar is static and
  // must stay reachable, so the inert treatment is scoped to mobile widths.
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // Restored after mount rather than during render so the server HTML and the
  // first client render agree. Storage can throw in private windows.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === '1');
    } catch {
      /* stay expanded */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* preference just won't persist */
      }
      return next;
    });
  }

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // An account predating the roles table reports no permissions at all. Hiding
  // every link would strand it, so an absent list falls back to showing
  // everything and letting the API refuse what it must.
  const permissions = admin?.permissions;
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: permissions ? group.items.filter((item) => !item.needs || permissions.includes(item.needs)) : group.items,
  })).filter((group) => group.items.length > 0);

  // The login page renders without the shell chrome.
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // The mobile drawer always shows labels; the icon rail is a desktop mode.
  const rail = collapsed && !isMobile;

  /**
   * Only leave once the server has actually cleared the cookie. Pretending to
   * sign out while the session is still live is worse than showing an error,
   * on a shared machine the next person can navigate straight back in.
   */
  async function logout() {
    setSigningOut(true);
    setLogoutError('');
    try {
      await adminApi.post('/api/auth/logout', {});
    } catch {
      setLogoutError('Could not sign out. Check your connection and try again.');
      setSigningOut(false);
      return;
    }
    // Full reload so no client cache outlives the session.
    window.location.assign('/admin/login');
  }

  return (
    <div className="flex min-h-screen">
      {/* Off-screen via translate still leaves links focusable, so tabbing used
          to land on invisible nav items. inert removes them from the tab order
          and the accessibility tree while the drawer is closed on mobile.
          lg:sticky pins it for the full viewport height while leaving it in
          normal flow, so the main column still sits beside it. */}
      <aside
        inert={!open && isMobile ? true : undefined}
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-cream-200 bg-white text-ink transition-[transform,width] duration-300 ease-soft lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0 shadow-card-hover' : '-translate-x-full'
        } ${rail ? 'lg:w-[76px]' : 'lg:w-64'}`}
      >
        <div className={`flex h-16 shrink-0 items-center gap-3 border-b border-cream-200 ${rail ? 'justify-center px-2' : 'px-5'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo */}
          <img src="/brand/logo-mark.svg" alt="" width={36} height={36} className="h-9 w-9 shrink-0" />
          {!rail ? (
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-lg text-charcoal-950">Clada Safari Bliss</p>
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted">Admin</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-cream-100 hover:text-ink lg:hidden"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Desktop-only toggle straddling the sidebar's right edge. */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!rail}
          title={rail ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3.5 top-[4.5rem] z-10 hidden h-7 w-7 items-center justify-center rounded-full border border-cream-300 bg-white text-muted shadow-sm transition-colors hover:border-gold-500 hover:text-gold-700 lg:flex"
        >
          <Icon name="collapse" className={`h-3.5 w-3.5 transition-transform duration-300 ${rail ? 'rotate-180' : ''}`} />
        </button>

        {/* Scrolls internally if the nav ever outgrows a short viewport. */}
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden px-3 py-5" aria-label="Admin sections">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              {rail ? (
                <div aria-hidden className="mx-auto mb-2 h-px w-6 bg-cream-200" />
              ) : (
                <p className="mb-1.5 px-3 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted/80">
                  {group.label}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  const badge = item.badge === 'attention' && attentionCount > 0 ? attentionCount : 0;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        title={rail ? item.label : undefined}
                        className={`relative flex h-10 items-center gap-3 rounded-lg text-sm transition-colors ${
                          rail ? 'justify-center' : 'px-3'
                        } ${
                          active
                            ? 'bg-gold-50 font-medium text-gold-700'
                            : 'text-charcoal-800/80 hover:bg-cream-50 hover:text-charcoal-950'
                        }`}
                      >
                        {active ? (
                          <span aria-hidden className="absolute inset-y-2 -left-3 w-1 rounded-r-full bg-gold-500" />
                        ) : null}
                        <Icon name={item.icon} />
                        {rail ? (
                          <span className="sr-only">{item.label}</span>
                        ) : (
                          <span className="flex-1 truncate">{item.label}</span>
                        )}
                        {badge > 0 ? (
                          rail ? (
                            <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-maroon-600 ring-2 ring-white">
                              <span className="sr-only">{badge} needing attention</span>
                            </span>
                          ) : (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-gold-500 px-1.5 py-0.5 text-[0.7rem] font-medium text-charcoal-950">
                              {badge > 99 ? '99+' : badge}
                              <span className="sr-only"> needing attention</span>
                            </span>
                          )
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={`shrink-0 space-y-3 border-t border-cream-200 ${rail ? 'px-2 py-3' : 'p-4'}`}>
          <Link
            href="/"
            target="_blank"
            title={rail ? 'View public site' : undefined}
            className={`flex h-9 items-center gap-2.5 rounded-lg text-xs text-muted transition-colors hover:bg-cream-50 hover:text-gold-700 ${
              rail ? 'justify-center' : 'px-3'
            }`}
          >
            <Icon name="external" className="h-4 w-4" />
            <span className={rail ? 'sr-only' : ''}>View public site</span>
          </Link>

          {admin ? (
            <div className={`flex items-center gap-3 rounded-xl ${rail ? 'flex-col' : 'bg-cream-50 p-2.5'}`}>
              <span
                title={rail ? `${admin.name} · ${admin.email}` : undefined}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-leaf-100 text-xs font-medium text-leaf-700"
              >
                {initials(admin.name)}
              </span>
              {!rail ? (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-charcoal-950">{admin.name}</p>
                  <p className="truncate text-xs text-muted">{admin.email}</p>
                </div>
              ) : null}
              <button
                type="button"
                onClick={logout}
                disabled={signingOut}
                aria-label={signingOut ? 'Signing out' : 'Sign out'}
                title={signingOut ? 'Signing out…' : 'Sign out'}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-maroon-600/10 hover:text-maroon-600 disabled:opacity-60"
              >
                <Icon name="logout" className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          {logoutError ? (
            <p role="alert" className="text-xs text-maroon-600">
              {logoutError}
            </p>
          ) : null}
        </div>
      </aside>

      {/* A plain div, not a button: a full-viewport focusable element sat in the
          tab order and was announced as a button to screen readers. Escape and
          the in-drawer links already provide keyboard dismissal. */}
      {open ? (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-charcoal-950/30 backdrop-blur-[1px] lg:hidden"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Below lg this bar is the only way to reach the nav, so it stays put
            as the page scrolls. z-20 keeps it under the drawer and overlay. */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-cream-200 bg-white px-5 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-charcoal-900 transition-colors hover:bg-cream-100"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <span className="font-display text-lg">Clada Admin</span>
          {attentionCount > 0 ? (
            <Link
              href="/admin/enquiries"
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3 py-1 text-xs text-charcoal-950"
            >
              {attentionCount > 99 ? '99+' : attentionCount}
              <span>to action</span>
            </Link>
          ) : null}
        </header>

        {/* Centre the content column and cap it: with the sidebar on the left,
            a page left-aligned in a 2560px viewport strands everything right
            of ~1050px as dead space. mx-auto balances the gutters. */}
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
