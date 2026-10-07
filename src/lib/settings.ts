import { apiGet } from './api';
import { TAGS } from './tags';
import type { ApiImage, SiteSettings } from '@/types';

const img = (file: string, alt: string): ApiImage => ({ url: `/images/${file}`, alt });

/**
 * Used only when the API is unreachable, so the shell still renders with the
 * company's own details rather than an error page. Mirrors the defaults in
 * apps/content/defaults.py; the API is the source of truth.
 */
const ZEBRA = img('clada-2026-09-pexels-redrum-visuals-5819228-scaled.jpg', 'A herd of zebra grazing on open plains');
const CHEETAHS = img('clada-2026-10-pexels-magda-ehlers-pexels-39257491.jpg', 'Two cheetahs at a kill on dry grassland');
const LOGO: ApiImage = { url: '/brand/logo.png', alt: 'Clada Safari Bliss' };

const FALLBACK: SiteSettings = {
  brand: {
    name: 'Clada Safari Bliss',
    tagline: 'Beyond Magical',
    logo: LOGO,
    logoCompact: LOGO,
    logoOnLight: LOGO,
    mark: { url: '/brand/logo-mark.png', alt: 'Clada Safari Bliss' },
  },
  hero: {
    eyebrow: 'Top African Safaris',
    title: 'Explore Best African Safaris',
    subtitle: 'Thrilling experiences for the explorer in you.',
    backgroundImage: ZEBRA,
    primaryCta: { label: 'Safari Packages', href: '/tours?category=safari-packages' },
    secondaryCta: { label: 'Local Packages', href: '/tours?category=local' },
  },
  heroSlides: [ZEBRA, CHEETAHS],
  values: [],
  contact: {
    phone: '+254 727 999 944',
    whatsapp: '+254 727 999 944',
    email: 'info@cladasafaribliss.com',
    addressLine: 'Marist Lane, Karen',
    city: 'Nairobi, Kenya',
    supportHours: 'Mon to Sat 7.00 am – 8.00 pm, Sunday 8.00 am – 6.00 pm',
  },
  socials: {},
  video: {},
  newsletter: {
    heading: 'Our Newsletter',
    blurb: 'Occasional updates on new packages and safari seasons.',
  },
  footerBlurb:
    'Clada Safari Bliss Limited is a private travel and tours company registered in Kenya, offering elegant boutique travel experiences.',
  seo: {
    defaultTitle: 'Clada Safari Bliss',
    defaultDescription:
      'Tailor-made safaris in Kenya and Tanzania, Kenyan coast holidays, weekend getaways and international packages from Clada Safari Bliss, Nairobi.',
  },
  promo: {
    eyebrow: 'Air Ticketing',
    title: 'Flights found, booked and managed for you.',
    body: 'We help you find the best flights for your dates, destination, budget and class of service, then handle the booking, the ticket and any changes.',
    cta: { label: 'About air ticketing', href: '/air-ticketing' },
    image: CHEETAHS,
  },
  about: {
    title: 'About Us',
    intro: 'Your loyal travel companion',
    heading: 'Company Profile',
    paragraphs: [
      'Clada Safari Bliss Limited was established to offer elegant boutique travel experiences, with tailor made itineraries and a personal touch.',
    ],
    images: [],
    pillars: [],
  },
  home: {
    packagesEyebrow: 'Hand-picked',
    packagesTitle: 'Popular packages',
    destinationsEyebrow: 'Where we go',
    destinationsTitle: 'Top destinations',
    testimonialsImage: ZEBRA,
    ctaTitle: 'Have a question? Contact us!',
    ctaBody:
      'Reach out to Clada Safari Bliss today to begin planning your unforgettable adventure. Our friendly team is ready to assist you with any questions, bookings or travel arrangements.',
    ctaImage: CHEETAHS,
  },
  pages: {
    tours: { title: 'Packages & Safaris', subtitle: '', image: ZEBRA },
    destinations: { title: 'Destinations', subtitle: '', image: ZEBRA },
    services: { title: 'What we do', subtitle: '', image: CHEETAHS },
    about: { title: 'About Us', subtitle: 'Your loyal travel companion', image: ZEBRA },
    contact: { title: 'Contact Us', subtitle: '', image: CHEETAHS },
    blog: { title: 'Travel Journal', subtitle: '', image: ZEBRA },
    credits: { title: 'Photo credits', subtitle: '', image: ZEBRA },
  },
  // While the API is down we cannot know whether the admin has switched the
  // pricing notice off, so the cautious choice is to show it.
  notice: { enabled: true, text: 'Prices are a guide and subject to availability at the time of booking.' },
  navigation: [],
  // Mirrors the API default; the phone above is the fallback number.
  whatsappWidget: {
    enabled: true,
    number: '',
    greeting: 'Hi there 👋 Tell us where you would like to go and we will reply on WhatsApp.',
    quickReplies: ['Inquire about a safari package', 'Kenyan coast holiday', 'International package', 'Air ticketing'],
  },
};

export async function getSettings(): Promise<SiteSettings> {
  try {
    const live = await apiGet<Partial<SiteSettings>>('/api/settings', { tags: [TAGS.settings] });
    // Sections an older API does not send fall back rather than crash the page.
    return { ...FALLBACK, ...live, pages: { ...FALLBACK.pages, ...(live.pages ?? {}) } } as SiteSettings;
  } catch (err) {
    console.error('[settings] falling back to defaults:', (err as Error).message);
    return FALLBACK;
  }
}
