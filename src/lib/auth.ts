import { cookies } from 'next/headers';
import { SERVER_API_URL } from './api';

export const AUTH_COOKIE = 'csb_admin_token';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  /** Legacy coarse role, kept in step with the assigned role by the API. */
  role: 'admin' | 'editor';
  /** Name of the assigned role, or null for an account predating the roles table. */
  roleName?: string | null;
  /** Resolved permission strings: what the dashboard shows is driven by these. */
  permissions?: string[];
  lastLoginAt?: string;
}

/** True when the signed-in admin holds every one of `required`. */
export function can(admin: AdminUser | null, ...required: string[]): boolean {
  if (!admin) return false;
  const held = admin.permissions ?? [];
  return required.every((p) => held.includes(p));
}

/**
 * Server-side session check. Forwards the httpOnly cookie to the Django API, which is
 * the only place the JWT is verified; the web app never decodes it itself.
 *
 * Next 15: cookies() is async.
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${SERVER_API_URL}/api/auth/me`, {
      headers: { cookie: `${AUTH_COOKIE}=${token}` },
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const payload = await res.json();
    return payload?.success ? (payload.data as AdminUser) : null;
  } catch {
    return null;
  }
}

/** Builds the cookie header for server-side admin API calls. */
export async function adminCookieHeader(): Promise<string | undefined> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  return token ? `${AUTH_COOKIE}=${token}` : undefined;
}
