'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { TourForm } from '@/components/admin/TourForm';
import { StatusPill } from '@/components/admin/StatusPill';
import { useCatalogOptions } from '@/lib/useCatalogOptions';
import type { Tour } from '@/types';

export default function EditTourPage({ params }: { params: Promise<{ id: string }> }) {
  // Next 15: params is a Promise; `use` unwraps it in a client component.
  const { id } = use(params);

  const [tour, setTour] = useState<Tour | null>(null);
  const { categories, countries, areas, destinations } = useCatalogOptions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .get<Tour>(`/api/admin/tours/${id}`)
      .then(setTour)
      .catch((err) =>
        setError(err instanceof AdminApiError ? err.message : 'Could not load this tour.')
      )
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

  if (error || !tour) {
    return (
      <div className="max-w-xl rounded-card border border-cream-200 bg-white p-8 text-center">
        <h1 className="mb-3 text-xl">Package not found</h1>
        <p className="mb-6 text-sm text-muted">{error || 'This package may have been deleted.'}</p>
        <Link href="/admin/tours" className="text-sm text-leaf-700 underline">
          Back to packages
        </Link>
      </div>
    );
  }

  return (
    <div>
      <nav className="mb-5 text-sm">
        <Link href="/admin/tours" className="text-muted hover:underline">
          ← Back to packages
        </Link>
      </nav>

      <header className="mb-7 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{tour.title}</h1>
        <StatusPill status={tour.status} />
        {tour.status === 'published' ? (
          <Link
            href={`/tours/${tour.slug}`}
            target="_blank"
            className="text-sm text-leaf-700 underline"
          >
            View live ↗
          </Link>
        ) : null}
      </header>

      <TourForm tour={tour} destinations={destinations} categories={categories} countries={countries} areas={areas} />
    </div>
  );
}
