'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { PageForm } from '@/components/admin/PageForm';
import { StatusPill } from '@/components/admin/StatusPill';
import type { CmsPage } from '@/types';

export default function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  // Next 15: params is a Promise; `use` unwraps it in a client component.
  const { id } = use(params);
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .get<CmsPage>(`/api/admin/pages/${id}`)
      .then(setPage)
      .catch((err) => setError(err instanceof AdminApiError ? err.message : 'Could not load this page.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-cream-200" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-card bg-white" />
        ))}
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="max-w-xl rounded-card border border-cream-200 bg-white p-8 text-center">
        <h1 className="mb-3 text-xl">Page not found</h1>
        <p className="mb-6 text-sm text-muted">{error || 'This page may have been deleted.'}</p>
        <Link href="/admin/pages" className="text-sm text-leaf-700 underline">
          Back to pages
        </Link>
      </div>
    );
  }

  return (
    <div>
      <nav className="mb-5 text-sm">
        <Link href="/admin/pages" className="text-muted hover:underline">
          ← Back to pages
        </Link>
      </nav>
      <header className="mb-7 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{page.title}</h1>
        <StatusPill status={page.status} />
        {page.status === 'published' ? (
          <Link href={`/${page.slug}`} target="_blank" className="text-sm text-leaf-700 underline">
            View live ↗
          </Link>
        ) : null}
      </header>
      {/* Keyed on the record so a save that changes the slug re-seeds the form. */}
      <PageForm key={page._id} page={page} />
    </div>
  );
}
