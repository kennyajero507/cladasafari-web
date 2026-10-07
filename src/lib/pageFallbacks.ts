import type { Metadata } from 'next';
import type { CmsPage, PageContact, SiteSettings } from '@/types';

/**
 * Stand-ins for the About and Contact pages, built from Site settings, used
 * when the API has no published page with that slug (deleted, unpublished,
 * or the API is unreachable at build time). They mirror what the API's seed
 * creates and its `contact_details()`, so the site reads the same either way.
 */

const DATE = new Date(0).toISOString();

function stub(settings: SiteSettings, slug: 'about' | 'contact'): Omit<CmsPage, 'title' | 'template' | 'sections' | 'contactDetails'> {
  const banner = settings.pages[slug];
  return {
    _id: `fallback-${slug}`,
    id: `fallback-${slug}`,
    slug,
    eyebrow: '',
    subtitle: banner.subtitle,
    heroImage: banner.image,
    body: '',
    contact: {},
    seo: null,
    showInFooter: false,
    order: 0,
    status: 'published',
    createdAt: DATE,
    updatedAt: DATE,
  };
}

export function contactFromSettings(settings: SiteSettings): PageContact {
  const { contact, socials } = settings;
  const digits = (v: string) => v.replace(/\D/g, '');

  const phones: PageContact['phones'] = contact.phone ? [{ label: 'Phone', number: contact.phone, whatsapp: false }] : [];
  if (contact.whatsapp) {
    const same = phones.find((p) => digits(p.number) === digits(contact.whatsapp!));
    if (same) same.whatsapp = true;
    else phones.push({ label: 'WhatsApp', number: contact.whatsapp, whatsapp: true });
  }
  const lines = [contact.addressLine, contact.poBox, contact.city].filter((l): l is string => Boolean(l));

  return {
    emails: contact.email ? [{ label: 'Email', address: contact.email }] : [],
    phones,
    offices: lines.length ? [{ name: 'Office', lines }] : [],
    hours: contact.supportHours,
    socials: socials ?? {},
    showForm: true,
    formHeading: '',
  };
}

export function aboutFallback(settings: SiteSettings): CmsPage {
  const { about, values, contact } = settings;
  return {
    ...stub(settings, 'about'),
    title: settings.pages.about.title,
    template: 'standard',
    contactDetails: null,
    seo: { metaTitle: 'About Us' },
    sections: [
      {
        id: 'story',
        type: 'imageText',
        eyebrow: about.intro,
        heading: about.heading,
        body: about.paragraphs.join('\n\n'),
        images: about.images.slice(0, 2),
        imageSide: 'right',
      },
      ...(about.pillars.length
        ? [
            {
              id: 'pillars',
              type: 'cards' as const,
              tone: 'dark' as const,
              eyebrow: 'What we plan',
              heading: 'Three ways to travel with us',
              items: about.pillars.map((p) => ({ ...p, linkLabel: `See ${p.title.toLowerCase()} →` })),
            },
          ]
        : []),
      ...(values?.length
        ? [
            {
              id: 'values',
              type: 'cards' as const,
              tone: 'light' as const,
              eyebrow: 'How we work',
              heading: 'What you can expect',
              items: values.map((v) => ({ title: v.title, body: v.description })),
            },
          ]
        : []),
      {
        id: 'cta',
        type: 'cta',
        tone: 'dark',
        heading: `Based in ${contact.city}`,
        body: `${contact.supportHours}.`,
        ctaLabel: 'Plan your trip',
        ctaHref: '/contact',
      },
    ],
  };
}

export function contactFallback(settings: SiteSettings): CmsPage {
  return {
    ...stub(settings, 'contact'),
    title: settings.pages.contact.title,
    template: 'contact',
    sections: [],
    seo: { metaTitle: 'Contact Us' },
    contactDetails: contactFromSettings(settings),
  };
}

/** Plain text of the first paragraph of Markdown, for a meta description. */
function firstParagraph(markdown: string): string {
  const para = markdown
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .find((b) => b && !b.startsWith('#') && !/^[-*\d]/.test(b));
  return (para ?? '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_]/g, '').slice(0, 180);
}

export function pageMetadata(page: CmsPage, fallbackDescription?: string): Metadata {
  const description = page.seo?.metaDescription || page.subtitle || firstParagraph(page.body) || fallbackDescription;
  const image = page.seo?.ogImage || page.heroImage?.url;
  return {
    title: page.seo?.metaTitle || page.title,
    description,
    openGraph: { title: page.seo?.metaTitle || page.title, description, ...(image ? { images: [{ url: image }] } : {}) },
  };
}
