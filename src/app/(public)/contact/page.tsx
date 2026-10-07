import type { Metadata } from 'next';
import { CmsPageView } from '@/components/pages/CmsPageView';
import { getPage } from '@/lib/pages';
import { contactFallback, pageMetadata } from '@/lib/pageFallbacks';
import { getSettings } from '@/lib/settings';

const DESCRIPTION = 'Tell us where, when and who is travelling, and Clada Safari Bliss will come back with options.';

/**
 * Edited under Pages › Contact. Its own emails, phones and offices win; any it
 * leaves blank come from Site settings › Contact, as does the whole page when
 * it has not been created or the API is unreachable.
 */
async function load() {
  const [page, settings] = await Promise.all([getPage('contact'), getSettings()]);
  // A page at this slug switched to another template still needs the form here.
  const usable = page && page.template === 'contact' && page.contactDetails ? page : null;
  return { page: usable ?? contactFallback(settings), settings };
}

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await load();
  return pageMetadata(page, DESCRIPTION);
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ page, settings }, sp] = await Promise.all([load(), searchParams]);
  const interest = typeof sp.interest === 'string' ? sp.interest : undefined;
  return <CmsPageView page={page} fallbackImage={settings.pages.contact.image} interest={interest} />;
}
