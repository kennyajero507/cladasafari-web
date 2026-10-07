import type { Metadata } from 'next';
import { CmsPageView } from '@/components/pages/CmsPageView';
import { getPage } from '@/lib/pages';
import { aboutFallback, pageMetadata } from '@/lib/pageFallbacks';
import { getSettings } from '@/lib/settings';

const DESCRIPTION =
  'Clada Safari Bliss plans Kenyan getaways, East African safaris, and international travel for people who want it done properly.';

/**
 * Edited under Pages › About in the dashboard. Until that page exists (or
 * while the API is unreachable) the same layout is built from Site settings,
 * which restate what the company's own website says. No founding dates, team
 * sizes or accreditations are claimed: none have been supplied.
 */
async function load() {
  const [page, settings] = await Promise.all([getPage('about'), getSettings()]);
  return { page: page ?? aboutFallback(settings), settings };
}

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await load();
  return pageMetadata(page, DESCRIPTION);
}

export default async function AboutPage() {
  const { page, settings } = await load();
  return <CmsPageView page={page} fallbackImage={settings.pages.about.image} />;
}
