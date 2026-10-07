import { NextResponse, type NextRequest } from 'next/server';

const AUTH_COOKIE = 'csb_admin_token';

/**
 * Guards the whole admin area. Previously only /admin itself redirected when
 * signed out, so every other admin page rendered its full shell, fired its
 * fetches, and showed a row of 401 error banners instead of a login screen.
 *
 * This is a presence check on the cookie only; the JWT is verified by the API,
 * which stays the single source of truth. A forged or expired cookie gets past
 * here and is rejected by the API, which adminApi turns into a redirect back to
 * /admin/login.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const signedIn = Boolean(request.cookies.get(AUTH_COOKIE)?.value);
  const isLoginPage = pathname === '/admin/login';

  if (!signedIn && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    // Preserve where they were headed so login can send them back.
    url.searchParams.set('from', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // Already signed in and sitting on the login page, send them inside.
  if (signedIn && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
