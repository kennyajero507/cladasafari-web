'use client';

import { useState } from 'react';
import { formatPrice, hasPrice, telHref, whatsappHref } from '@/lib/format';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';

interface BookingCardProps {
  tourId: string;
  tourTitle: string;
  priceFrom: number;
  currency: string;
  phone: string;
  /** The WhatsApp chat number, or null when chat is switched off in Site settings. */
  whatsapp?: string | null;
  priceBasis?: string;
}

type Guests = { adults: number; children: number; infants: number };
type Tab = 'book' | 'enquiry';

/**
 * Sticky sidebar card with BOOK / ENQUIRY tabs. Both submit to the same
 * enquiries endpoint: no payment is taken here, so "Book now" opens a
 * request rather than a transaction.
 */
export function BookingCard({
  tourId,
  tourTitle,
  priceFrom,
  currency,
  phone,
  whatsapp,
  priceBasis = 'per person',
}: BookingCardProps) {
  const [tab, setTab] = useState<Tab>('book');
  const [guests, setGuests] = useState<Guests>({ adults: 2, children: 0, infants: 0 });
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [reference, setReference] = useState<string | null>(null);

  function adjust(key: keyof Guests, delta: number) {
    setGuests((g) => {
      const min = key === 'adults' ? 1 : 0;
      return { ...g, [key]: Math.max(min, Math.min(20, g[key] + delta)) };
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending');
    setFieldErrors({});

    const form = new FormData(e.currentTarget);
    const payload = {
      type: 'booking' as const,
      tour: tourId,
      tourTitle,
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? '') || undefined,
      travelDate: String(form.get('travelDate') ?? '') || undefined,
      message: String(form.get('message') ?? '') || undefined,
      guests,
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok || !body?.success) {
        if (body?.error?.details) setFieldErrors(body.error.details);
        throw new Error(body?.error?.message ?? 'We could not send your request.');
      }
      setReference(body.data?.reference ?? null);
      setState('done');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  if (state === 'done') {
    return (
      <div
        role="status"
        className="overflow-hidden rounded-[3px] border border-cream-300 bg-white p-8 text-center shadow-card"
      >
        <span aria-hidden className="mb-4 block text-4xl">
          ✈️
        </span>
        <h3 className="mb-3 font-display text-xl">Request received</h3>
        <p className="text-sm leading-relaxed text-muted">
          Thank you. We will be in touch about <strong className="text-ink">{tourTitle}</strong>
          {reference ? (
            <>
              {' '}
              and your reference is <strong className="text-ink">{reference}</strong>
            </>
          ) : null}
          .
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[3px] border border-cream-300 bg-white shadow-card">
      <div role="tablist" aria-label="Booking options" className="grid grid-cols-2">
        {(['book', 'enquiry'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`py-3.5 text-xs font-semibold uppercase tracking-[0.15em] transition-colors ${
              tab === t ? 'bg-charcoal-900 text-cream-50' : 'bg-cream-100 text-muted hover:text-charcoal-900'
            }`}
          >
            {t === 'book' ? 'Book' : 'Enquiry'}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="p-5">
        <div className="mb-5 border-b border-cream-200 pb-4">
          {hasPrice(priceFrom) ? <p className="text-xs text-muted">From</p> : null}
          <p className="font-display text-2xl text-charcoal-900">
            {formatPrice(priceFrom, currency)}
            {hasPrice(priceFrom) && priceBasis ? (
              <span className="ml-1 font-sans text-xs font-normal text-muted">{priceBasis}</span>
            ) : null}
          </p>
          {hasPrice(priceFrom) ? null : (
            <p className="mt-1 text-xs text-muted">Send a request and we will quote for your dates.</p>
          )}
        </div>

        <div className="space-y-3.5">
          <Field label="Full name" name="name" placeholder="Your name" required error={fieldErrors.name} />
          <Field
            label="Email address"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            error={fieldErrors.email}
          />
          <Field
            label="Phone number"
            name="phone"
            type="tel"
            placeholder="+254 7XX XXX XXX"
            error={fieldErrors.phone}
          />

          {tab === 'book' ? (
            <>
              <Field label="Select date" name="travelDate" type="date" error={fieldErrors.travelDate} />

              <fieldset className="space-y-2 pt-1">
                <legend className="sr-only">Guests</legend>
                {(
                  [
                    ['adults', 'Adults', 'Age 13+'],
                    ['children', 'Children', 'Age 2-12'],
                    ['infants', 'Infants', 'Under 2'],
                  ] as const
                ).map(([key, label, hint]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm">
                      <span className="block text-ink">{label}</span>
                      <span className="block text-[0.68rem] text-muted">{hint}</span>
                    </span>
                    <span className="flex items-center gap-2.5">
                      <Stepper label={`Remove one ${label}`} onClick={() => adjust(key, -1)}>
                        −
                      </Stepper>
                      <span aria-live="polite" className="w-5 text-center text-sm font-medium">
                        {guests[key]}
                      </span>
                      <Stepper label={`Add one ${label}`} onClick={() => adjust(key, 1)}>
                        +
                      </Stepper>
                    </span>
                  </div>
                ))}
              </fieldset>
            </>
          ) : (
            <div>
              <label htmlFor="bk-message" className="mb-1 block text-[0.72rem] text-muted">
                Your question
              </label>
              <textarea
                id="bk-message"
                name="message"
                rows={4}
                placeholder="Dates you have in mind, group size, anything you want to know…"
                className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {state === 'error' ? (
          <p role="alert" className="mt-4 rounded-lg bg-maroon-600/10 px-3 py-2.5 text-xs text-maroon-700">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={state === 'sending'}
          className="mt-5 h-12 w-full rounded-full bg-gold-500 text-sm font-medium text-charcoal-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending…' : tab === 'book' ? 'Book now →' : 'Send enquiry →'}
        </button>

        {/* The quicker route for people who would rather not fill in a form:
            WhatsApp opens with the tour already named. */}
        {whatsapp ? (
          <a
            href={whatsappHref(whatsapp, `Hi, I am interested in booking: ${tourTitle}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#25D366] text-sm font-medium text-[#128C7E] transition-colors hover:bg-[#25D366] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
          >
            <WhatsAppIcon size={18} />
            Chat on WhatsApp
            <span className="sr-only">(opens WhatsApp in a new tab)</span>
          </a>
        ) : null}

        <a
          href={`tel:${telHref(phone)}`}
          className="mt-4 flex items-center justify-center gap-2 text-xs text-leaf-700 transition-colors hover:text-gold-600"
        >
          <PhoneIcon />
          {phone}
        </a>

        <p className="mt-2 text-center text-[0.68rem] text-muted">
          No payment now. We reply with a written quote.
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required = false,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={`bk-${name}`} className="mb-1 block text-[0.72rem] text-muted">
        {label}
      </label>
      <input
        id={`bk-${name}`}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`h-10 w-full rounded-lg border px-3 text-sm focus:outline-none ${
          error ? 'border-maroon-600' : 'border-cream-300 focus:border-gold-500'
        }`}
      />
      {error ? <p className="mt-1 text-[0.68rem] text-maroon-600">{error}</p> : null}
    </div>
  );
}

function Stepper({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded-full border border-cream-300 text-sm text-charcoal-900 transition-colors hover:border-gold-500 hover:text-gold-600"
    >
      {children}
    </button>
  );
}

function PhoneIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}
