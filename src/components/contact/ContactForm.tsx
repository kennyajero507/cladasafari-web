'use client';

import { useState } from 'react';

/**
 * The general enquiry form. `interests` comes from /api/enquiries/options so
 * the dropdown and the API's validator can never disagree.
 */
export function ContactForm({ interests, defaultInterest }: { interests: string[]; defaultInterest?: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending');
    setErrors({});

    const form = new FormData(e.currentTarget);
    const budget = String(form.get('budget') ?? '').trim();

    const payload = {
      type: 'contact' as const,
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? '') || undefined,
      interest: String(form.get('interest') ?? '') || undefined,
      budget: budget ? Number(budget) : undefined,
      budgetCurrency: budget ? String(form.get('budgetCurrency') ?? 'KES') : undefined,
      message: String(form.get('message') ?? ''),
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok || !body?.success) {
        if (body?.error?.details) setErrors(body.error.details);
        throw new Error(body?.error?.message ?? 'We could not send your enquiry.');
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
      <div role="status" className="rounded-[3px] border border-leaf-200 bg-leaf-50 p-10 text-center">
        <span aria-hidden className="mb-4 block text-4xl">
          ✈️
        </span>
        <h3 className="mb-3 text-2xl">Your enquiry is on its way</h3>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted">
          Thank you. We will come back to you with options.
          {reference ? (
            <>
              {' '}
              Your reference is <strong className="text-ink">{reference}</strong>; please quote it if you
              call us.
            </>
          ) : null}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[3px] border border-[#e6dfc9] bg-white p-7 shadow-card md:p-9">
      <h2 className="mb-2 text-2xl">Tell us about your trip</h2>
      <p className="mb-7 text-sm leading-relaxed text-muted">
        Where, when, who is travelling and a rough budget. The more you tell us, the closer our first
        options will be.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" name="name" required error={errors.name} autoComplete="name" />
        <Field label="Email address" name="email" type="email" required error={errors.email} autoComplete="email" />
        <Field label="Phone / WhatsApp" name="phone" type="tel" error={errors.phone} autoComplete="tel" />

        <div>
          <label htmlFor="contact-interest" className="mb-1.5 block text-sm font-medium text-ink">
            I am interested in
          </label>
          <select
            id="contact-interest"
            name="interest"
            defaultValue={defaultInterest ?? ''}
            className="h-11 w-full rounded-[3px] border border-cream-300 bg-white px-4 text-sm focus:border-gold-500 focus:outline-none"
          >
            <option value="">Not sure yet</option>
            {interests.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          {errors.interest ? <p className="mt-1 text-xs text-maroon-600">{errors.interest}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="contact-budget" className="mb-1.5 block text-sm font-medium text-ink">
            Rough budget per person <span className="font-normal text-muted">(optional)</span>
          </label>
          <div className="flex gap-2">
            <select
              name="budgetCurrency"
              aria-label="Budget currency"
              defaultValue="KES"
              className="h-11 rounded-[3px] border border-cream-300 bg-white px-3 text-sm focus:border-gold-500 focus:outline-none"
            >
              <option value="KES">KES</option>
              <option value="USD">USD</option>
            </select>
            <input
              id="contact-budget"
              name="budget"
              type="number"
              min={0}
              inputMode="numeric"
              aria-invalid={errors.budget ? true : undefined}
              className={`h-11 w-full rounded-[3px] border px-4 text-sm focus:outline-none ${
                errors.budget ? 'border-maroon-600' : 'border-cream-300 focus:border-gold-500'
              }`}
            />
          </div>
          {errors.budget ? <p className="mt-1 text-xs text-maroon-600">{errors.budget}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-ink">
            Trip details <span className="text-muted">*</span>
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={5}
            required
            placeholder="Your dates, how many are travelling, where you would like to go, and anything else that matters."
            aria-invalid={errors.message ? true : undefined}
            className={`w-full rounded-[3px] border px-4 py-3 text-sm focus:outline-none ${
              errors.message ? 'border-maroon-600' : 'border-cream-300 focus:border-gold-500'
            }`}
          />
          {errors.message ? <p className="mt-1 text-xs text-maroon-600">{errors.message}</p> : null}
        </div>
      </div>

      {state === 'error' ? (
        <p role="alert" className="mt-5 rounded-[3px] bg-maroon-600/10 px-4 py-3 text-sm text-maroon-700">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="mt-7 h-12 w-full rounded-[3px] bg-leaf-500 text-sm font-medium text-white transition-colors hover:bg-leaf-700 disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {state === 'sending' ? 'Sending…' : 'Send enquiry'}
      </button>

      <p className="mt-4 text-xs text-muted">No payment is taken. We reply with a written quote.</p>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required = false,
  error,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={`contact-${name}`} className="mb-1.5 block text-sm font-medium text-ink">
        {label} {required ? <span className="text-muted">*</span> : null}
      </label>
      <input
        id={`contact-${name}`}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `contact-${name}-error` : undefined}
        className={`h-11 w-full rounded-[3px] border px-4 text-sm focus:outline-none ${
          error ? 'border-maroon-600' : 'border-cream-300 focus:border-gold-500'
        }`}
      />
      {error ? (
        <p id={`contact-${name}-error`} className="mt-1 text-xs text-maroon-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
