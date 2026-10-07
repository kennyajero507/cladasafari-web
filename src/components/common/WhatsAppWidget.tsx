'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { whatsappHref } from '@/lib/format';
import { WhatsAppIcon } from './WhatsAppIcon';

const SEEN_KEY = 'hb-whatsapp-greeting-seen';
const MESSAGE_MAX = 500;

/**
 * Floating WhatsApp button, bottom-right on every public page. It opens a
 * small chat card: the greeting from Site settings, quick-reply chips that
 * fill the message, and "Start chat", which opens wa.me in a new tab with the
 * message typed in. Nothing is sent from this site; WhatsApp takes over.
 *
 * The badge stands for that greeting: it shows until the visitor first opens
 * the card, then stays away on later visits (remembered in this browser).
 */
export function WhatsAppWidget({
  number,
  greeting,
  quickReplies,
  businessName,
  avatarUrl,
}: {
  /** Any format; wa.me needs digits only and whatsappHref strips the rest. */
  number: string;
  greeting: string;
  quickReplies: string[];
  businessName: string;
  avatarUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  // Starts "seen" so the server render and first client render agree, and a
  // returning visitor never sees the badge flash.
  const [unread, setUnread] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const inputId = useId();

  useEffect(() => {
    try {
      setUnread(window.localStorage.getItem(SEEN_KEY) !== '1');
    } catch {
      setUnread(true); // storage blocked: show it once per page view
    }
  }, []);

  function toggle() {
    setOpen((v) => !v);
    if (unread) {
      setUnread(false);
      try {
        window.localStorage.setItem(SEEN_KEY, '1');
      } catch {
        /* just won't be remembered */
      }
    }
  }

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  // Outside click and Escape close the card; opening moves focus to the message.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus({ preventScroll: true });
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const href = whatsappHref(number, text);

  return (
    <div
      ref={rootRef}
      // Clear of iPhone home indicators and browser bottom bars.
      className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 md:right-6 md:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
    >
      {open ? (
        <div
          role="dialog"
          aria-labelledby={titleId}
          className="absolute bottom-full right-0 mb-3 w-[min(22rem,calc(100vw-2rem))] origin-bottom-right overflow-hidden rounded-2xl bg-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] motion-safe:animate-wa-pop"
        >
          <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3.5 text-white">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- small SVG logo mark */}
              <img src={avatarUrl} alt="" width={30} height={30} className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <p id={titleId} className="truncate text-sm font-semibold">
                {businessName}
              </p>
              <p className="text-xs text-white/75">Chat with us on WhatsApp</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close WhatsApp chat"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="space-y-3 bg-[#ECE5DD] px-4 py-4">
            {greeting ? (
              <p className="relative max-w-[88%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-sm leading-relaxed text-ink shadow-sm">
                {greeting}
              </p>
            ) : null}

            {quickReplies.length ? (
              <div role="group" aria-label="Quick questions" className="flex flex-wrap gap-1.5">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    aria-pressed={text === reply}
                    onClick={() => {
                      setText(reply);
                      inputRef.current?.focus();
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      text === reply
                        ? 'border-[#075E54] bg-[#075E54] text-white'
                        : 'border-[#075E54]/30 bg-white text-[#075E54] hover:border-[#075E54]'
                    }`}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="border-t border-cream-200 p-3">
            <label htmlFor={inputId} className="sr-only">
              Your message
            </label>
            <textarea
              id={inputId}
              ref={inputRef}
              rows={2}
              value={text}
              maxLength={MESSAGE_MAX}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, as in WhatsApp; Shift+Enter adds a line.
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  window.open(href, '_blank', 'noopener,noreferrer');
                  setOpen(false);
                }
              }}
              placeholder="Type a message…"
              className="w-full resize-none rounded-lg border border-cream-300 px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none"
            />
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] text-sm font-semibold text-white transition-colors hover:bg-[#1ebe5a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#075E54] focus-visible:ring-offset-2"
            >
              <WhatsAppIcon size={18} />
              Start chat
              <span className="sr-only">(opens WhatsApp in a new tab)</span>
            </a>
          </div>
        </div>
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? 'Close WhatsApp chat' : `Chat with ${businessName} on WhatsApp${unread ? ', 1 new message' : ''}`}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_28px_-6px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-soft hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#25D366]"
      >
        {unread && !open ? (
          <span aria-hidden className="absolute inset-0 rounded-full bg-[#25D366] opacity-60 motion-safe:animate-ping" />
        ) : null}
        <WhatsAppIcon size={28} className="relative" />
        {unread && !open ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-maroon-600 px-1 text-[0.68rem] font-semibold text-white ring-2 ring-white"
          >
            1
          </span>
        ) : null}
      </button>
    </div>
  );
}
