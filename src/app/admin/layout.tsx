import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/AdminShell';
import { ToastProvider } from '@/components/admin/Toasts';
import { getCurrentAdmin, adminCookieHeader } from '@/lib/auth';
import { SERVER_API_URL } from '@/lib/api';

/**
 * The admin area is deliberately unlinked from the public site. It is reachable
 * only by typing the URL, and search engines are told to ignore it here and in
 * robots.ts.
 */
export const metadata: Metadata = {
  title: 'Admin: Clada Safari Bliss',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Drives the nav badge: enquiries nobody has picked up, plus any that are past
 * their follow-up date. This counts work outstanding rather than mail unopened
 * the old "unread" number went to zero the moment someone glanced at a row,
 * which said nothing about whether the customer had been answered.
 *
 * A failure returns 0 rather than throwing: a missing badge is a smaller
 * problem than an admin area that will not render.
 */
async function loadAttentionCount(cookie?: string): Promise<number> {
  if (!cookie) return 0;
  try {
    const res = await fetch(`${SERVER_API_URL}/api/admin/enquiries?limit=1`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (!res.ok) return 0;
    const meta = (await res.json())?.meta;
    return (meta?.unassignedCount ?? 0) + (meta?.overdueCount ?? 0);
  } catch {
    return 0;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Null on the login page too; AdminShell renders a bare frame in that case.
  const admin = await getCurrentAdmin();
  const attentionCount = admin ? await loadAttentionCount(await adminCookieHeader()) : 0;

  return (
    <div className="min-h-screen bg-cream-100">
      <ToastProvider>
        <AdminShell admin={admin} attentionCount={attentionCount}>
          {children}
        </AdminShell>
      </ToastProvider>
    </div>
  );
}
