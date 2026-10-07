import { PageBanner } from '@/components/ui/PageBanner';
import { Markdown } from '@/components/ui/Markdown';
import { apiGetSafe } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { ApiImage, CmsPage } from '@/types';
import { ContactPanel } from './ContactPanel';
import { PageSections } from './PageSections';

const DEFAULT_INTERESTS = ['Local Packages', 'Getaways', 'International Packages', 'Safari Packages', 'Air Ticketing', 'Tailor-made Trip'];

/**
 * Renders an editable page: banner, body, the contact panel for the contact
 * template, then the arranged sections.
 *
 *   standard  body in a reading column, then sections
 *   legal     body as a policy document with its last-updated date
 *   contact   body as an intro, then the enquiry form and contact details
 */
export async function CmsPageView({
  page,
  fallbackImage,
  interest,
}: {
  page: CmsPage;
  /** Banner image when the page has none of its own. */
  fallbackImage: ApiImage;
  /** Contact template: the ?interest= to preselect in the form. */
  interest?: string;
}) {
  const legal = page.template === 'legal';
  const options =
    page.template === 'contact' && page.contactDetails?.showForm
      ? await apiGetSafe<{ interests: string[] }>('/api/enquiries/options', { interests: DEFAULT_INTERESTS })
      : null;
  const defaultInterest = interest && options?.interests.includes(interest) ? interest : undefined;

  return (
    <>
      <PageBanner
        eyebrow={page.eyebrow || undefined}
        title={page.title}
        subtitle={page.subtitle || undefined}
        image={page.heroImage ?? fallbackImage}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: `/${page.slug}`, label: page.title },
        ]}
      />

      {page.body || page.isSample ? (
        <section className={`${legal ? 'bg-white' : 'bg-cream-50'} py-14 md:py-20`}>
          <div className="container-page max-w-3xl">
            {page.isSample ? (
              <p className="mb-6 inline-block rounded-full bg-cream-200 px-3 py-1 text-[0.68rem] uppercase tracking-wider text-muted">
                Sample content
              </p>
            ) : null}
            {legal ? (
              <p className="mb-8 text-sm text-muted">
                Last updated <time dateTime={page.updatedAt}>{formatDate(page.updatedAt)}</time>
              </p>
            ) : null}
            {page.body ? (
              <div className={legal ? 'border-t border-cream-300 pt-8' : undefined}>
                <Markdown content={page.body} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {page.template === 'contact' && page.contactDetails ? (
        <ContactPanel
          details={page.contactDetails}
          interests={options?.interests ?? DEFAULT_INTERESTS}
          defaultInterest={defaultInterest}
        />
      ) : null}

      <PageSections sections={page.sections} />
    </>
  );
}
