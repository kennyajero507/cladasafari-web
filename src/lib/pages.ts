import { apiGet, apiListSafe, ApiRequestError } from './api';
import { TAGS } from './tags';
import type { CmsPage } from '@/types';

/**
 * One published page, or null when there is none (or the API is down), so
 * callers can fall back. Other errors still throw to the error boundary.
 * The contact page also follows Site settings, so it carries that tag too.
 */
export async function getPage(slug: string): Promise<CmsPage | null> {
  try {
    return await apiGet<CmsPage>(`/api/pages/${encodeURIComponent(slug)}`, {
      tags: [TAGS.pages, TAGS.page(slug), TAGS.settings],
    });
  } catch (err) {
    if (err instanceof ApiRequestError && (err.status === 404 || err.status === 0)) return null;
    throw err;
  }
}

/** Published pages flagged for the footer, in their set order. */
export async function getFooterPages(): Promise<CmsPage[]> {
  const { items } = await apiListSafe<CmsPage>('/api/pages?footer=true&limit=20', { tags: [TAGS.pages] });
  return items;
}

/** Every published page, for the sitemap. */
export async function getPages(): Promise<CmsPage[]> {
  const { items } = await apiListSafe<CmsPage>('/api/pages?limit=100', { tags: [TAGS.pages] });
  return items;
}
