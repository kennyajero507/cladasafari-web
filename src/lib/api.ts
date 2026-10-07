import type { ApiSuccess, PageMeta } from '@/types';
import { DEFAULT_REVALIDATE } from './tags';

/** The API as the browser reaches it. */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001';

/**
 * The API as the Next.js server reaches it. The same as API_URL except where
 * the two live on a private network (Docker: http://api:8000), set by
 * API_INTERNAL_URL. Only ever read on the server.
 */
const SERVER_API_URL = process.env.API_INTERNAL_URL ?? API_URL;

function baseUrl(): string {
  return typeof window === 'undefined' ? SERVER_API_URL : API_URL;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface FetchOptions {
  tags?: string[];
  /** Seconds. Pass `false` to opt out of caching entirely (admin reads). */
  revalidate?: number | false;
  method?: string;
  body?: unknown;
  /** Forward the admin cookie on server-side admin requests. */
  cookie?: string;
}

/**
 * Next 15 does NOT cache fetch by default, so every public read passes an
 * explicit `next: { revalidate, tags }`; otherwise each render hits the API.
 */
async function request<T>(path: string, options: FetchOptions = {}): Promise<ApiSuccess<T>> {
  const { tags, revalidate = DEFAULT_REVALIDATE, method = 'GET', body, cookie } = options;

  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers.cookie = cookie;

  const init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {
    method,
    headers,
    credentials: 'include',
  };
  if (body) init.body = JSON.stringify(body);

  if (revalidate === false) {
    init.cache = 'no-store';
  } else {
    init.next = { revalidate, ...(tags?.length ? { tags } : {}) };
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, init);
  } catch {
    throw new ApiRequestError(
      'We could not reach the server. Please check your connection and try again.',
      0,
      'NETWORK_ERROR'
    );
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok || !payload?.success) {
    const err = payload?.error;
    throw new ApiRequestError(
      err?.message ?? 'Something went wrong.',
      res.status,
      err?.code ?? 'UNKNOWN',
      err?.details
    );
  }

  return payload as ApiSuccess<T>;
}

/** Returns data only; use when the caller does not need pagination meta. */
export async function apiGet<T>(path: string, options?: FetchOptions): Promise<T> {
  const { data } = await request<T>(path, options);
  return data;
}

/** Returns data and meta together, for paginated listings. */
export async function apiList<T>(
  path: string,
  options?: FetchOptions
): Promise<{ items: T[]; meta?: PageMeta }> {
  const { data, meta } = await request<T[]>(path, options);
  return { items: data, meta };
}

export async function apiSend<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
  options?: Omit<FetchOptions, 'method' | 'body'>
): Promise<T> {
  const { data } = await request<T>(path, { ...options, method, body, revalidate: false });
  return data;
}

/**
 * Public reads that should degrade to an empty state rather than crash the
 * page when the API is unavailable.
 */
export async function apiGetSafe<T>(path: string, fallback: T, options?: FetchOptions): Promise<T> {
  try {
    return await apiGet<T>(path, options);
  } catch (err) {
    console.error(`[api] ${path} failed:`, (err as Error).message);
    return fallback;
  }
}

export async function apiListSafe<T>(
  path: string,
  options?: FetchOptions
): Promise<{ items: T[]; meta?: PageMeta }> {
  try {
    return await apiList<T>(path, options);
  } catch (err) {
    console.error(`[api] ${path} failed:`, (err as Error).message);
    return { items: [] };
  }
}

export { API_URL, SERVER_API_URL };
