'use client';

import { API_URL } from './api';
import type { PageMeta } from '@/types';

/**
 * Browser-side admin client. Always sends the httpOnly cookie and never
 * caches, so the dashboard reflects the database immediately.
 */
export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: Record<string, string>
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

/**
 * A 7-day session that expires mid-edit used to surface as an inline red banner
 * on every page, with no way back to the login screen short of typing the URL.
 * Any 401 now sends the browser to /admin/login, remembering where it was.
 */
function redirectToLogin(): never {
  if (typeof window !== 'undefined') {
    const from = `${window.location.pathname}${window.location.search}`;
    const target = from.startsWith('/admin/login')
      ? '/admin/login'
      : `/admin/login?from=${encodeURIComponent(from)}`;
    window.location.replace(target);
  }
  throw new AdminApiError('Your session has expired. Please sign in again.', 401);
}

/**
 * `signingIn` opts out of the 401-means-expired-session redirect. On the login
 * form a 401 is the answer to the question being asked ("are these the right
 * credentials?"), not a lapsed session, and redirecting swallows the API's
 * message and clears the form instead of explaining what was wrong.
 */
async function request<T>(
  path: string,
  init: RequestInit = {},
  { signingIn = false }: { signingIn?: boolean } = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new AdminApiError('Could not reach the API. Is the server running?', 0);
  }

  if (res.status === 401 && !signingIn) redirectToLogin();

  const payload = await res.json().catch(() => null);

  if (!res.ok || !payload?.success) {
    throw new AdminApiError(
      payload?.error?.message ?? 'Request failed.',
      res.status,
      payload?.error?.details
    );
  }

  return payload.data as T;
}

export const adminApi = {
  get: <T>(path: string) => request<T>(path),

  list: async <T>(path: string) => {
    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, { credentials: 'include', cache: 'no-store' });
    } catch {
      throw new AdminApiError('Could not reach the API. Is the server running?', 0);
    }
    if (res.status === 401) redirectToLogin();
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      throw new AdminApiError(payload?.error?.message ?? 'Request failed.', res.status);
    }
    return {
      items: (payload.data ?? []) as T[],
      meta: payload.meta as PageMeta | undefined,
    };
  },

  post: <T>(path: string, body: unknown, opts?: { signingIn?: boolean }) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, opts),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  remove: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  /**
   * Bulk endpoints. `resource` is the admin path segment ('tours', 'blog', …).
   * One request for the whole selection rather than N sequential ones, so a
   * batch cannot half-apply and the admin waits once.
   */
  bulkStatus: <T>(resource: string, ids: string[], status: string) =>
    request<T>(`/api/admin/${resource}/bulk/status`, {
      method: 'PATCH',
      body: JSON.stringify({ ids, status }),
    }),

  bulkRemove: <T>(resource: string, ids: string[]) =>
    request<T>(`/api/admin/${resource}/bulk`, {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    }),

  async upload(file: File): Promise<{ url: string; filename: string }> {
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`${API_URL}/api/admin/uploads`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });

    if (res.status === 401) redirectToLogin();

    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      throw new AdminApiError(payload?.error?.message ?? 'Upload failed.', res.status);
    }
    return payload.data;
  },
};
