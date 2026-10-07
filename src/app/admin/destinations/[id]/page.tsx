'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { DestinationForm } from '@/components/admin/DestinationForm';
import { StatusPill } from '@/components/admin/StatusPill';
import type { Destination } from '@/types';

export default function EditDestinationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [destination, setDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .get<Destination>(`/api/admin/destinations/${id}`)
      .then(setDestination)
      .catch((err) =>
        setError(err instanceof AdminApiError ? err.message : 'Could not load this destination.')
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

  if (error || !destination) {
    return (
      <div className="max-w-xl rounded-card border border-cream-200 bg-white p-8 text-center">
        <h1 className="mb-3 text-xl">Destination not found</h1>
        <p className="mb-6 text-sm text-muted">{error || 'It may have been deleted.'}</p>
        <Link href="/admin/destinations" className="text-sm text-leaf-700 underline">
          Back to destinations
        </Link>
      </div>
    );
  }

  return (
    <div>
      <nav className="mb-5 text-sm">
        <Link href="/admin/destinations" className="text-muted hover:underline">
          ← Back to destinations
        </Link>
      </nav>

      <header className="mb-7 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{destination.name}</h1>
        <StatusPill status={destination.status} />
        {destination.status === 'published' ? (
          <Link
            href={`/destinations/${destination.slug}`}
            target="_blank"
            className="text-sm text-leaf-700 underline"
          >
            View live ↗
          </Link>
        ) : null}
      </header>

      <DestinationForm destination={destination} />
    </div>
  );
}
