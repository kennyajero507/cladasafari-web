import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentAdmin, adminCookieHeader } from '@/lib/auth';
import { SERVER_API_URL } from '@/lib/api';
import { StatusPill } from '@/components/admin/StatusPill';
import { formatDate } from '@/lib/format';
import type { Enquiry, Tour } from '@/types';

/**
 * `null` means the count could not be loaded, distinct from a real zero. A
 * dead API used to render a confident "0 Tours, 0 Enquiries", which reads as
 * data loss rather than a connection problem.
 */
type Count = number | null;

interface Dashboard {
  tours: Count;
  drafts: Count;
  destinations: Count;
  blog: Count;
  blogDrafts: Count;
  testimonials: Count;
  faqs: Count;
  enquiries: Count;
  unassignedEnquiries: Count;
  overdueEnquiries: Count;
  recentEnquiries: Enquiry[];
  recentTours: Tour[];
  failed: boolean;
}

async function loadDashboard(cookie?: string): Promise<Dashboard> {
  const unknown: Dashboard = {
    tours: null,
    drafts: null,
    destinations: null,
    blog: null,
    blogDrafts: null,
    testimonials: null,
    faqs: null,
    enquiries: null,
    unassignedEnquiries: null,
    overdueEnquiries: null,
    recentEnquiries: [],
    recentTours: [],
    failed: true,
  };
  if (!cookie) return unknown;

  const get = async (path: string) => {
    try {
      const res = await fetch(`${SERVER_API_URL}${path}`, { headers: { cookie }, cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const [
    tours,
    drafts,
    destinations,
    blog,
    blogDrafts,
    testimonials,
    faqs,
    enquiries,
    recentEnquiries,
    recentTours,
  ] = await Promise.all([
    get('/api/admin/tours?limit=1'),
    get('/api/admin/tours?limit=1&status=draft'),
    get('/api/admin/destinations?limit=1'),
    get('/api/admin/blog?limit=1'),
    get('/api/admin/blog?limit=1&status=draft'),
    get('/api/admin/testimonials?limit=1'),
    get('/api/admin/faqs?limit=1'),
    get('/api/admin/enquiries?limit=1'),
    // What actually needs attention, rather than only how many there are.
    get('/api/admin/enquiries?limit=5&sort=newest'),
    get('/api/admin/tours?limit=5&sort=newest&status=draft'),
  ]);

  const responses = [tours, drafts, destinations, blog, testimonials, faqs, enquiries];
  const total = (res: unknown) =>
    (res as { meta?: { total?: number } } | null)?.meta?.total ?? null;

  return {
    tours: total(tours),
    drafts: total(drafts),
    destinations: total(destinations),
    blog: total(blog),
    blogDrafts: total(blogDrafts),
    testimonials: total(testimonials),
    faqs: total(faqs),
    enquiries: total(enquiries),
    unassignedEnquiries: enquiries?.meta?.unassignedCount ?? null,
    overdueEnquiries: enquiries?.meta?.overdueCount ?? null,
    recentEnquiries: (recentEnquiries?.data ?? []) as Enquiry[],
    recentTours: (recentTours?.data ?? []) as Tour[],
    failed: responses.some((r) => r === null),
  };
}

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/admin/login');

  const cookie = await adminCookieHeader();
  const counts = await loadDashboard(cookie);

  const unassigned = counts.unassignedEnquiries;
  const overdue = counts.overdueEnquiries;

  const cards = [
    {
      label: 'Packages',
      value: counts.tours,
      hint: counts.drafts === null ? undefined : `${counts.drafts} in draft`,
      href: '/admin/tours',
    },
    { label: 'Destinations', value: counts.destinations, href: '/admin/destinations' },
    {
      label: 'Blog posts',
      value: counts.blog,
      hint: counts.blogDrafts === null ? undefined : `${counts.blogDrafts} in draft`,
      href: '/admin/blog',
    },
    { label: 'Testimonials', value: counts.testimonials, href: '/admin/testimonials' },
    { label: 'FAQs', value: counts.faqs, href: '/admin/faqs' },
    {
      label: 'Enquiries',
      value: counts.enquiries,
      hint:
        unassigned === null
          ? undefined
          : unassigned > 0
            ? `${unassigned} unassigned`
            : 'All picked up',
      href: '/admin/enquiries',
      highlight: unassigned !== null && unassigned > 0,
    },
  ];

  // The one line that says what to do next, rather than what exists.
  const needsAttention: Array<{ text: string; href: string }> = [];
  if (overdue !== null && overdue > 0) {
    needsAttention.push({
      text: `${overdue} ${overdue === 1 ? 'enquiry' : 'enquiries'} overdue a follow-up`,
      href: '/admin/enquiries?overdue=true',
    });
  }
  if (unassigned !== null && unassigned > 0) {
    needsAttention.push({
      text: `${unassigned} unassigned ${unassigned === 1 ? 'enquiry' : 'enquiries'}`,
      href: '/admin/enquiries?assignee=unassigned',
    });
  }
  if (counts.drafts !== null && counts.drafts > 0) {
    needsAttention.push({
      text: `${counts.drafts} unpublished ${counts.drafts === 1 ? 'tour' : 'tours'}`,
      href: '/admin/tours?status=draft',
    });
  }
  if (counts.blogDrafts !== null && counts.blogDrafts > 0) {
    needsAttention.push({
      text: `${counts.blogDrafts} unpublished ${counts.blogDrafts === 1 ? 'post' : 'posts'}`,
      href: '/admin/blog?status=draft',
    });
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl">Welcome back, {admin.name.split(' ')[0]}</h1>
        <p className="mt-2 text-sm text-muted">
          Everything published here appears on the public site within moments.
        </p>
      </header>

      {counts.failed ? (
        <p
          role="alert"
          className="mb-5 rounded-lg bg-maroon-600/10 px-4 py-3 text-sm text-maroon-700"
        >
          Some counts could not be loaded. The API may be unreachable. Figures shown as “–”
          are unknown, not zero.
        </p>
      ) : null}

      {needsAttention.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-gold-400 bg-gold-50 px-5 py-4">
          <span className="text-sm font-medium text-charcoal-950">Needs attention:</span>
          {needsAttention.map((item, i) => (
            <span key={item.href} className="text-sm">
              {i > 0 ? <span className="mr-3 text-muted">·</span> : null}
              <Link href={item.href} className="text-charcoal-800 underline hover:text-gold-700">
                {item.text}
              </Link>
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-card border bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card ${
              card.highlight ? 'border-gold-400' : 'border-cream-200'
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-muted">{card.label}</p>
            <p className="mt-2 font-display text-4xl text-charcoal-900">
              {card.value === null ? (
                <span className="text-cream-300" title="Could not load">
                  –
                </span>
              ) : (
                card.value
              )}
            </p>
            {card.hint ? (
              <p className={`mt-1 text-xs ${card.highlight ? 'text-gold-600' : 'text-muted'}`}>
                {card.hint}
              </p>
            ) : null}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-card border border-cream-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl">Latest enquiries</h2>
            <Link href="/admin/enquiries" className="text-xs text-leaf-700 underline">
              View all
            </Link>
          </div>

          {counts.recentEnquiries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Nothing yet. Submissions from the contact and booking forms land here.
            </p>
          ) : (
            <ul className="divide-y divide-cream-100">
              {counts.recentEnquiries.map((e) => (
                <li key={e._id}>
                  <Link
                    href="/admin/enquiries"
                    className="flex items-center gap-3 py-3 transition-colors hover:bg-cream-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.name}</p>
                      <p className="truncate text-xs text-muted">
                        {e.type === 'booking' ? `Booking · ${e.tourTitle ?? '–'}` : 'Contact'} ·{' '}
                        {formatDate(e.createdAt)}
                      </p>
                    </div>
                    <StatusPill status={e.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-cream-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl">Drafts to finish</h2>
            <Link href="/admin/tours?status=draft" className="text-xs text-leaf-700 underline">
              View all
            </Link>
          </div>

          {counts.recentTours.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No unpublished packages: everything you have written is live.
            </p>
          ) : (
            <ul className="divide-y divide-cream-100">
              {counts.recentTours.map((t) => (
                <li key={t._id}>
                  <Link
                    href={`/admin/tours/${t._id}`}
                    className="flex items-center gap-3 py-3 transition-colors hover:bg-cream-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="truncate text-xs text-muted">
                        {t.durationDays}d · {t.countries?.join(', ')}
                      </p>
                    </div>
                    <StatusPill status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-card border border-cream-200 bg-white p-7">
        <h2 className="mb-4 text-xl">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { href: '/admin/tours/new', label: 'New package' },
            { href: '/admin/blog/new', label: 'New blog post' },
            { href: '/admin/destinations/new', label: 'New destination' },
            { href: '/admin/settings', label: 'Edit homepage content' },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-full bg-gold-500 px-5 py-2.5 text-sm font-medium text-charcoal-950 transition-colors hover:bg-gold-400"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
