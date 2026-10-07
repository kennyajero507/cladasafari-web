import Link from 'next/link';
import { DestinationForm } from '@/components/admin/DestinationForm';

export default function NewDestinationPage() {
  return (
    <div>
      <nav className="mb-5 text-sm">
        <Link href="/admin/destinations" className="text-muted hover:underline">
          ← Back to destinations
        </Link>
      </nav>
      <h1 className="mb-7 text-3xl">New destination</h1>
      <DestinationForm />
    </div>
  );
}
