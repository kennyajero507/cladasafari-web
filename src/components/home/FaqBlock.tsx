import { FaqAccordion } from '@/components/ui/Accordion';
import { ButtonLink } from '@/components/ui/Button';
import type { Faq } from '@/types';

/** Two columns: heading and CTA on the left, the accordion on the right. */
export function FaqBlock({ faqs }: { faqs: Faq[] }) {
  if (!faqs.length) return null;

  return (
    <section className="bg-cream-50 py-12 sm:py-16 md:py-28">
      <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:h-fit">
          <p className="eyebrow mb-3 text-gold-700">FAQ</p>
          <h2 className="text-3xl leading-[1.15] md:text-[2.6rem]">Before you book</h2>
          <p className="mt-5 text-sm leading-relaxed text-muted">
            How packages and prices work. If your question is not here, send it to us and we will
            answer it directly.
          </p>
          <div className="mt-8">
            <ButtonLink href="/contact">Ask a question</ButtonLink>
          </div>
        </div>

        <FaqAccordion faqs={faqs} />
      </div>
    </section>
  );
}
