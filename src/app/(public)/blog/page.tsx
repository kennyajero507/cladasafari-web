import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageBanner } from '@/components/ui/PageBanner';
import { BlogCard } from '@/components/blog/BlogCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { CardGridSkeleton } from '@/components/ui/Skeleton';
import { apiListSafe } from '@/lib/api';
import { getSettings } from '@/lib/settings';
import { TAGS } from '@/lib/tags';
import type { BlogPost } from '@/types';

export const metadata: Metadata = {
  title: 'Travel Journal',
  description: 'Planning guides and travel notes from Clada Safari Bliss.',
};

/**
 * The banner renders straight away and the articles stream in behind a
 * skeleton. This was a route-level loading.tsx, which also wrapped
 * /blog/[slug] and made its 404s answer 200.
 */
export default async function BlogPage() {
  const banner = (await getSettings()).pages.blog;

  return (
    <>
      <PageBanner
        title={banner.title}
        subtitle={banner.subtitle}
        image={banner.image}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/blog', label: 'Travel Journal' },
        ]}
      />

      <section className="bg-cream-50 py-16 md:py-24">
        <div className="container-page">
          <Suspense fallback={<CardGridSkeleton count={6} />}>
            <BlogListing />
          </Suspense>
        </div>
      </section>
    </>
  );
}

async function BlogListing() {
  const { items } = await apiListSafe<BlogPost>('/api/blog?limit=24', { tags: [TAGS.blog] });

  if (items.length === 0) {
    return (
      <EmptyState
        title="No articles yet"
        message="New planning guides are on the way. In the meantime, ask us anything directly."
        action={<ButtonLink href="/contact">Ask a question</ButtonLink>}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((post, i) => (
        <Reveal key={post._id} delay={i * 80}>
          <BlogCard post={post} />
        </Reveal>
      ))}
    </div>
  );
}
