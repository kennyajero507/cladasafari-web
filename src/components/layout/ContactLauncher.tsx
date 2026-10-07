'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { telHref, whatsappHref } from '@/lib/format';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';

interface TawkApi {
  maximize?: () => void;
  hideWidget?: () => void;
  onLoad?: () => void;
}

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

/**
 * Live chat is optional: set NEXT_PUBLIC_TAWK_SRC to the business's own Tawk.to
 * embed URL (https://embed.tawk.to/<property>/<widget>) to enable it. Without
 * it the launcher offers only the direct channels from Site settings.
 */
const TAWK_SRC = process.env.NEXT_PUBLIC_TAWK_SRC ?? '';

/**
 * Floating contact launcher, bottom-right on every public page. The bubble
 * fans out to the channels that are actually configured: WhatsApp when a
 * WhatsApp number is set, then call and email, and live chat when enabled.
 *
 * The chat embed is ~200KB of third-party JS with its own cookies, so it loads
 * on the first click rather than on page load.
 *
 * When the WhatsApp widget is on, it owns the corner: the launcher sits above
 * it (`stacked`) and is given no WhatsApp number, so the channel is not offered twice.
 */
export function ContactLauncher({
  phone,
  whatsapp,
  email,
  stacked = false,
}: {
  phone: string;
  whatsapp?: string;
  email: string;
  stacked?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const loadState = useRef<'idle' | 'loading' | 'ready'>('idle');

  // Appears after a short scroll so it does not sit over the hero buttons.
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const openChat = useCallback(() => {
    setOpen(false);
    if (loadState.current === 'ready') {
      window.Tawk_API?.maximize?.();
      return;
    }
    if (loadState.current === 'loading') return;

    loadState.current = 'loading';
    setLoading(true);
    const api: TawkApi = window.Tawk_API ?? {};
    api.onLoad = () => {
      loadState.current = 'ready';
      setLoading(false);
      window.Tawk_API?.hideWidget?.();
      window.Tawk_API?.maximize?.();
    };
    window.Tawk_API = api;
    window.Tawk_LoadStart = new Date();

    const script = document.createElement('script');
    script.async = true;
    script.src = TAWK_SRC;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    script.onerror = () => {
      // Blocked or offline: reset so a later click retries, and fall back to
      // email rather than leaving a dead button.
      loadState.current = 'idle';
      setLoading(false);
      window.location.href = `mailto:${email}`;
    };
    const insert = () => document.body.appendChild(script);
    if (document.readyState === 'complete') insert();
    else window.addEventListener('load', insert, { once: true });
  }, [email]);

  const channels = [
    ...(whatsapp
      ? [{ key: 'whatsapp', label: 'WhatsApp', href: whatsappHref(whatsapp), className: 'bg-[#25D366] text-white hover:bg-[#1ebe5a]', icon: <WhatsAppIcon />, external: true }]
      : []),
    { key: 'call', label: 'Call us', href: `tel:${telHref(phone)}`, className: 'bg-cream-100 text-charcoal-950 hover:bg-white', icon: <PhoneIcon />, external: false },
    { key: 'email', label: 'Email us', href: `mailto:${email}`, className: 'bg-cream-100 text-charcoal-950 hover:bg-white', icon: <MailIcon />, external: false },
  ];

  const shell = visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0';
  const item = () =>
    `flex items-center gap-2.5 rounded-full py-2.5 pl-3 pr-4 text-sm font-medium shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
      open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-95 opacity-0'
    }`;

  return (
    <div
      ref={rootRef}
      className={`fixed right-4 z-40 flex flex-col items-end gap-3 transition-all duration-500 md:right-6 ${
        stacked
          ? // Above the 56px WhatsApp button plus a gap, on the same safe-area baseline.
            'bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:bottom-[calc(5.75rem+env(safe-area-inset-bottom))]'
          : 'bottom-4 md:bottom-6'
      } ${shell}`}
    >
      {channels.map((channel, i) => (
        <a
          key={channel.key}
          href={channel.href}
          {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          onClick={() => setOpen(false)}
          className={`${item()} ${channel.className}`}
          style={{ transitionDelay: open ? `${(channels.length - i) * 30}ms` : '0ms' }}
        >
          {channel.icon}
          {channel.label}
        </a>
      ))}

      {TAWK_SRC ? (
        <button
          type="button"
          onClick={openChat}
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          className={`${item()} bg-gold-500 text-charcoal-950 hover:bg-gold-400`}
        >
          <ChatIcon small />
          Live chat
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Hide contact options' : 'Contact us'}
        disabled={loading}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-500 text-charcoal-950 shadow-[0_0_0_8px_rgba(214,161,60,0.16),0_8px_24px_-6px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-105 hover:bg-gold-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-80 md:h-14 md:w-14"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
}

function ChatIcon({ small = false }: { small?: boolean }) {
  return (
    <svg width={small ? 16 : 22} height={small ? 16 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="shrink-0">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
