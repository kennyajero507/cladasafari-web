'use client';

import { useState } from 'react';
import type { Faq } from '@/types';

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?._id ?? null);
  if (!faqs.length) return null;

  return (
    <div className="mx-auto max-w-3xl divide-y divide-cream-200 overflow-hidden rounded-card border border-cream-200 bg-white">
      {faqs.map((faq) => {
        const open = openId === faq._id;
        return (
          <div key={faq._id}>
            <h3>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : faq._id)}
                aria-expanded={open}
                aria-controls={`faq-panel-${faq._id}`}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-cream-50"
              >
                <span className="font-display text-base text-charcoal-900 md:text-lg">
                  {faq.question}
                </span>
                <span
                  aria-hidden
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cream-300 text-leaf-700 transition-transform duration-300 ${
                    open ? 'rotate-45 border-gold-500 text-gold-600' : ''
                  }`}
                >
                  +
                </span>
              </button>
            </h3>
            <div
              id={`faq-panel-${faq._id}`}
              hidden={!open}
              className="px-6 pb-6 text-sm leading-relaxed text-muted"
            >
              {faq.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
