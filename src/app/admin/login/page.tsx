'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { adminApi, AdminApiError } from '@/lib/adminApi';

/** Only ever send the user to a path inside this app. */
function safeReturnPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/admin';
  return raw.startsWith('/admin/login') ? '/admin' : raw;
}

/** Turns a failed sign-in into something that names the actual cause. */
function signInMessage(err: unknown): string {
  if (!(err instanceof AdminApiError)) {
    return 'Sign-in failed. Please try again.';
  }
  // 0 is adminApi's marker for "fetch threw", i.e. the API was unreachable.
  if (err.status === 0) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  if (err.status === 429) {
    // The limiter is 10 failed attempts per 15 minutes, and the old redirect
    // hid those failures, so a correct password can land here. Say so plainly,
    // otherwise it reads as "my password stopped working".
    return err.message || 'Too many sign-in attempts. Wait a few minutes, then try again.';
  }
  if (err.status === 401) {
    return 'That email and password do not match an account.';
  }
  // The API validates with 422 and puts the per-field reason in details,
  // which is more specific than its generic "correct the highlighted fields".
  if (err.status === 400 || err.status === 422) {
    const field = err.details && Object.values(err.details)[0];
    return field || err.message || 'Enter a valid email address and password.';
  }
  if (err.status >= 500) {
    return 'The server had a problem signing you in. Please try again shortly.';
  }
  return err.message || 'Sign-in failed. Please try again.';
}

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get('from'));
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending');
    setMessage('');

    const form = new FormData(e.currentTarget);

    try {
      await adminApi.post(
        '/api/auth/login',
        {
          email: String(form.get('email') ?? '').trim(),
          password: String(form.get('password') ?? ''),
        },
        { signingIn: true }
      );
      // A full navigation, not router.push: the session cookie is set on this
      // response, and middleware reads cookies server-side. A client-side push
      // could run the guard before the browser has committed the cookie, which
      // bounced a valid sign-in straight back to this page.
      window.location.assign(returnTo);
    } catch (err) {
      setState('error');
      setMessage(signInMessage(err));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link
            href="/"
            aria-label="Clada Safari Bliss, back to the homepage"
            className="mb-5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo */}
            <img
              src="/brand/logo-on-light.svg"
              alt="Clada Safari Bliss"
              width={240}
              height={110}
              className="h-28 w-auto transition-opacity hover:opacity-80"
            />
          </Link>
          <h1 className="text-2xl text-charcoal-900">Administrator sign in</h1>
          <p className="mt-2 text-sm text-muted">
            Manage packages, destinations and enquiries.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-card border border-cream-200 bg-white p-7 shadow-card"
        >
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-ink">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="h-11 w-full rounded-lg border border-cream-300 bg-white px-4 text-sm text-ink focus:border-gold-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-ink">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="h-11 w-full rounded-lg border border-cream-300 bg-white pl-4 pr-24 text-sm text-ink focus:border-gold-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                // Not in the tab order: the label already says what it does, and
                // a control between password and submit interrupts the sign-in
                // path for keyboard users.
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute right-1.5 top-1.5 flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium uppercase tracking-wide text-gold-700 transition-colors hover:bg-gold-500/10 hover:text-gold-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {state === 'error' ? (
            <p role="alert" className="rounded-lg border border-maroon-600/20 bg-maroon-600/10 px-4 py-3 text-sm text-maroon-700">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={state === 'sending'}
            className="h-11 w-full rounded-lg bg-gold-500 text-sm font-medium text-charcoal-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
          >
            {state === 'sending' ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.6 5.2A7.9 7.9 0 0 1 12 5c6.4 0 10 7 10 7a18.4 18.4 0 0 1-2.4 3.4M6.2 6.2A18.6 18.6 0 0 0 2 12s3.6 7 10 7a9.3 9.3 0 0 0 4.3-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

/** useSearchParams needs a Suspense boundary during prerender. */
export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
