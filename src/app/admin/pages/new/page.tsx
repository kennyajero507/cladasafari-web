'use client';

import Link from 'next/link';
import { PageForm } from '@/components/admin/PageForm';

export default function NewPagePage() {
  return (
    <div>
      <nav className="mb-5 text-sm">
        <Link href="/admin/pages" className="text-muted hover:underline">
          ← Back to pages
        </Link>
      </nav>
      <h1 className="mb-7 text-3xl">New page</h1>
      <PageForm />
    </div>
  );
}
