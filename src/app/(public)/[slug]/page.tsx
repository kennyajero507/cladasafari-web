import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CmsPageView } from '@/components/pages/CmsPageView';
import { getPage } from '@/lib/pages';
import { pageMetadata } from '@/lib/pageFallbacks';
import { getSettings } from '@/lib/settings';

type Params = Promise<{ slug: string }>;

/**
 * Pages created in the dashboard (Privacy Policy, Terms & Conditions, FAQs...)
 * at /<slug>. Every named route in (public) takes precedence over this one,
 * and the API refuses page slugs that would collide with them.
 *
 * notFound() is called from generateMetadata as well as the page, and there
 * is deliberately no loading.tsx here, so a missing page answers a real 404.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const page = await getPage((await params).slug);
  if (!page) notFound();
  return pageMetadata(page);
}

export default async function CmsPageRoute({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [page, settings] = await Promise.all([getPage(slug), getSettings()]);
  if (!page) notFound();

  return (
    <CmsPageView
      page={page}
      fallbackImage={settings.pages.about.image}
      interest={typeof sp.interest === 'string' ? sp.interest : undefined}
    />
  );
}
