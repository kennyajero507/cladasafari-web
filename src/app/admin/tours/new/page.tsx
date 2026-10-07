'use client';

import Link from 'next/link';
import { TourForm } from '@/components/admin/TourForm';
import { useCatalogOptions } from '@/lib/useCatalogOptions';

export default function NewTourPage() {
  const { categories, countries, areas, destinations } = useCatalogOptions();

  return (
    <div>
      <nav className="mb-5 text-sm">
        <Link href="/admin/tours" className="text-muted hover:underline">
          ← Back to packages
        </Link>
      </nav>
      <h1 className="mb-7 text-3xl">New package</h1>
      <TourForm destinations={destinations} categories={categories} countries={countries} areas={areas} />
    </div>
  );
}
