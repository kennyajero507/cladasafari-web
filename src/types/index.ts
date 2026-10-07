export type Status = 'draft' | 'published';
/** A country name as the API returns it ("Kenya", "Italy"...). The list lives in the database. */
export type Country = string;
/** A category slug ("locals", "kenyan-safaris"...). Tours always belong to a leaf category. */
export type TourCategory = string;
export type CategoryKind = 'local' | 'international' | 'safari';
export type Region = 'east-africa' | 'europe' | 'africa' | 'middle-east' | 'asia' | 'americas' | 'oceania' | 'other';

/** One ISO 3166-1 country for the destination form (/api/admin/countries/options). */
export interface CountryOption {
  /** ISO 3166-1 alpha-2, e.g. "KE". */
  code: string;
  name: string;
  /** The catalogue's region for it, or the suggested one for a new country. */
  region: Region;
  /** Its destination page, when it already has one; a country has at most one. */
  destination: { id: string; slug: string; name: string } | null;
}

export interface ApiImage {
  url: string;
  alt: string;
  caption?: string;
  /** e.g. "Photo by Magda Ehlers on Pexels". */
  credit?: string;
  sourceUrl?: string;
  /** Pixel size, when the media library knows it. */
  width?: number;
  height?: number;
}

export interface Seo {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
}

export interface CategoryRef {
  slug: string;
  name: string;
  kind: CategoryKind;
}

/** A node in the /api/categories tree, which drives the menu and the tour filters. */
export interface Category extends CategoryRef {
  _id: string;
  id: string;
  eyebrow: string;
  navLabel: string;
  description: string;
  heroImage: ApiImage | null;
  parent: CategoryRef | null;
  order: number;
  status: Status;
  isSample: boolean;
  tourCount?: number;
  children?: Category[];
}

/**
 * A node in the /api/areas tree: a regional group (Kenyan, Europe, Africa,
 * Asia & Middle East) or an area within one (Diani, France...). Independent of
 * categories; a tour can sit in several areas.
 */
export interface TravelArea {
  _id: string;
  id: string;
  name: string;
  slug: string;
  /** Short teaser, shown on the homepage portrait cards. */
  description: string;
  /** Label above the card title, e.g. "Locals / Kenya". */
  tag: string;
  image: ApiImage | null;
  /** How many destination places (parks, beaches, towns) the area covers. */
  placeCount: number;
  parent: { slug: string; name: string } | null;
  order: number;
  status: Status;
  isSample: boolean;
  tourCount?: number;
  children?: TravelArea[];
}

export interface TravelAreaRef {
  slug: string;
  name: string;
  group: { slug: string; name: string } | null;
}

export interface TourDestinationRef {
  slug: string;
  name: string;
  country: string;
  primary: boolean;
}

export interface CountryInfo {
  _id: string;
  id: string;
  name: string;
  slug: string;
  isoCode: string;
  region: Region;
  regionLabel: string;
  tourCount?: number;
}

export interface ItineraryDay {
  day: number;
  title: string;
  description?: string;
  activities: string[];
  meals: Array<'Breakfast' | 'Lunch' | 'Dinner'>;
  accommodation?: string;
}

export interface Tour {
  _id: string;
  id: string;
  title: string;
  slug: string;
  category: TourCategory;
  categoryInfo: CategoryRef & { group: CategoryRef | null };
  summary: string;
  description: string;
  priceFrom: number;
  currency: string;
  /** e.g. "per person". */
  priceBasis: string;
  durationDays: number;
  durationNights: number;
  durationLabel: string;
  groupSizeMax: number;
  difficulty: 'easy' | 'moderate' | 'challenging';
  rating: number;
  reviewCount: number;
  destination?: (Pick<Destination, '_id' | 'name' | 'slug' | 'country'> & { heroImage?: ApiImage }) | null;
  countries: Country[];
  /**
   * Every published destination page the tour visits (one per country), the
   * primary destination first. Use these for links; `destination` is the
   * primary one only.
   */
  destinations?: TourDestinationRef[];
  /** Travel areas this tour visits; empty for tours not yet placed. */
  areas?: TravelAreaRef[];
  /** The card's place line from the original site, e.g. "Diani, Coast". */
  locationLabel?: string | null;
  highlights: string[];
  itinerary: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  heroImage: ApiImage;
  gallery: ApiImage[];
  featured: boolean;
  bestSelling: boolean;
  status: Status;
  order: number;
  seo?: Seo | null;
  /* safaris */
  parks?: string[];
  gameDriveCount?: number | null;
  conservancyFeesIncluded?: boolean | null;
  /* packages and holidays */
  departsFrom?: string | null;
  departureDates?: string[];
  visaSupport?: boolean | null;
  flightsIncluded?: boolean | null;
  /** Generated demo content rather than a package from the business's own site. */
  isSample?: boolean;
  sourceNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A place within a destination: a park, city, island or beach. Called `parks` on the wire. */
export interface Park {
  name: string;
  slug?: string;
  kind?: string | null;
  blurb?: string | null;
  image?: ApiImage | null;
  bestTime?: string | null;
  highlights: string[];
}

export interface Destination {
  _id: string;
  id: string;
  name: string;
  slug: string;
  country: Country;
  countrySlug: string;
  /** ISO 3166-1 alpha-2 code of the country. */
  countryCode: string;
  region: Region;
  regionLabel: string;
  tagline?: string | null;
  categoryLabel?: string;
  overview: string;
  heroImage: ApiImage;
  cardImage: ApiImage;
  highlights: string[];
  bestTime?: { months: string[]; note?: string } | null;
  parks: Park[];
  parkCount: number;
  tourCount?: number | null;
  featured: boolean;
  status: Status;
  order: number;
  seo?: Seo | null;
  isSample?: boolean;
  sourceNote?: string | null;
}

export interface BlogPost {
  _id: string;
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: ApiImage;
  author: { name: string; avatar?: string };
  tags: string[];
  readingMinutes: number;
  publishedAt: string;
  featured: boolean;
  status: Status;
  seo?: Seo | null;
  isSample?: boolean;
}

export interface Testimonial {
  _id: string;
  id: string;
  authorName: string;
  authorLocation?: string | null;
  avatar?: { url?: string; alt?: string } | null;
  quote: string;
  rating: number;
  tour?: string | null;
  tourName?: string | null;
  featured: boolean;
  status: Status;
  order: number;
  /** Demo review: shown with a "sample review" label on the public site. */
  isSample?: boolean;
}

export interface Faq {
  _id: string;
  id: string;
  question: string;
  answer: string;
  group: 'general' | 'booking' | 'travel' | 'payment';
  order: number;
  status: Status;
  isSample?: boolean;
}

export interface Service {
  _id: string;
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  icon: string;
  image: ApiImage | null;
  highlights: string[];
  cta: Cta | null;
  order: number;
  status: Status;
  isSample?: boolean;
}

/** A media-library record: the image plus its credit and provenance. */
export interface MediaAsset {
  _id: string;
  id: string;
  url: string;
  alt: string;
  caption: string;
  title: string;
  source: 'original' | 'pexels' | 'upload' | 'other';
  photographer: string;
  sourceUrl: string;
  pexelsId: number | null;
  license: string;
  credit: string;
  width: number | null;
  height: number | null;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Cta {
  label: string;
  href: string;
}

export interface SiteSettings {
  brand: {
    name: string;
    tagline: string;
    logo: ApiImage;
    logoCompact: ApiImage;
    logoOnLight: ApiImage;
    mark: ApiImage;
  };
  hero: {
    eyebrow?: string;
    title: string;
    subtitle: string;
    backgroundImage: ApiImage;
    primaryCta: Cta;
    secondaryCta: Cta;
  };
  /** Rotating hero backgrounds, in order. */
  heroSlides: ApiImage[];
  values: Array<{ title: string; description: string; icon?: string; image?: ApiImage | null }>;
  contact: {
    phone: string;
    whatsapp?: string;
    email: string;
    addressLine?: string;
    poBox?: string;
    city: string;
    supportHours: string;
  };
  socials: Partial<Record<'facebook' | 'instagram' | 'x' | 'youtube' | 'tiktok', string>>;
  newsletter: { heading: string; blurb: string };
  /** The homepage film. Empty until an admin sets one; a placeholder shows instead. */
  video: { youtubeId?: string };
  footerBlurb: string;
  seo: { defaultTitle: string; defaultDescription: string; ogImage?: string };
  promo: { eyebrow: string; title: string; body: string; cta: Cta; image: ApiImage };
  about: {
    title: string;
    intro: string;
    heading: string;
    paragraphs: string[];
    images: ApiImage[];
    pillars: Array<{ title: string; eyebrow: string; body: string; href: string }>;
  };
  home: {
    packagesEyebrow: string;
    packagesTitle: string;
    destinationsEyebrow: string;
    destinationsTitle: string;
    testimonialsImage: ApiImage;
    ctaTitle: string;
    ctaBody: string;
    ctaImage: ApiImage;
  };
  /** Banner copy and imagery per top-level page. */
  pages: Record<PageKey, { title: string; subtitle: string; image: ApiImage }>;
  /** Site-wide disclaimer shown in the footer, e.g. while prices are placeholders. */
  notice: { enabled: boolean; text: string };
  /**
   * The public menu as arranged in the dashboard. Empty means automatic: the
   * menu is built from the category tree (see lib/navigation.ts).
   */
  navigation: NavMenuItem[];
  /** The floating WhatsApp chat. A blank number uses contact.whatsapp, then contact.phone. */
  whatsappWidget: { enabled: boolean; number: string; greeting: string; quickReplies: string[] };
}

/** A dropdown link in the arranged menu. The thumbnail is decorative. */
export interface NavMenuLink {
  id: string;
  label: string;
  href: string;
  visible: boolean;
  image?: { url: string; alt?: string } | null;
}

/** A catalogue record a menu item follows: its name, route and dropdown come from it. */
export interface NavSource {
  type: 'category' | 'area' | 'destination';
  slug: string;
}

/**
 * A top-level entry in the arranged menu; with children it opens a dropdown.
 * With a `source` it is linked: a blank label inherits the record's name, and
 * the route and dropdown are derived from the live catalogue (lib/navigation.ts),
 * so `href` and `children` are unused.
 */
export interface NavMenuItem {
  id: string;
  label: string;
  href: string;
  visible: boolean;
  children: NavMenuLink[];
  source?: NavSource | null;
  /** Linked items only: show the derived dropdown. Defaults to true. */
  showChildren?: boolean;
}

export type PageKey = 'tours' | 'destinations' | 'services' | 'about' | 'contact' | 'blog' | 'credits';

export interface Enquiry {
  _id: string;
  id: string;
  type: 'contact' | 'booking';
  name: string;
  email: string;
  phone?: string | null;
  interest?: string | null;
  budget?: number | null;
  budgetCurrency?: 'KES' | 'USD' | null;
  message?: string | null;
  tour?: { _id: string; title: string; slug: string } | null;
  tourTitle?: string | null;
  travelDate?: string | null;
  guests?: { adults: number; children: number; infants: number } | null;
  totalGuests?: number | null;
  status: EnquiryStatus;
  adminNotes?: string | null;
  isSample?: boolean;
  createdAt: string;

  /** Human-readable handle, e.g. "ENQ-2609-0042". */
  reference?: string;

  assignee?: AdminSummary | null;
  assignedAt?: string | null;

  lastContactedAt?: string | null;
  followUpAt?: string | null;
  closedAt?: string | null;

  /** Computed by the API: past its follow-up date and still open. */
  isOverdue?: boolean;

  /** Present on the detail response only, newest first. */
  events?: EnquiryEvent[];
}

/** The enquiry pipeline, in order. `won`/`lost` are terminal. */
export type EnquiryStatus = 'new' | 'assigned' | 'in_progress' | 'quoted' | 'won' | 'lost';

export interface AdminSummary {
  _id: string;
  id: string;
  name: string;
  email: string;
}

export type EnquiryEventType =
  | 'created'
  | 'status_change'
  | 'assigned'
  | 'unassigned'
  | 'note'
  | 'contacted';

export interface EnquiryEvent {
  _id: string;
  id: string;
  type: EnquiryEventType;
  /** Null for the public form's `created` entry. */
  actorName?: string | null;
  summary: string;
  note?: string | null;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  /**
   * Enquiry list only. `unassignedCount` is work nobody has picked up and
   * `overdueCount` is work past its follow-up date.
   */
  statusCounts?: Partial<Record<EnquiryStatus, number>>;
  unassignedCount?: number;
  overdueCount?: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}

export interface ApiFailure {
  success: false;
  error: { message: string; code: string; details?: Record<string, string> };
}

/* ---------- admin users, roles and audit ---------- */

export interface PermissionDef {
  key: string;
  label: string;
  hint?: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: PermissionDef[];
}

export interface Role {
  _id: string;
  id: string;
  name: string;
  description: string;
  permissions: string[];
  /** The Administrator role: always holds everything and cannot be edited. */
  locked: boolean;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  _id: string;
  id: string;
  email: string;
  name: string;
  role: { id: string; name: string; locked: boolean } | null;
  roleId: string | null;
  /** Demo account created by the seed; cannot sign in. */
  isSample?: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  _id: string;
  id: string;
  actorId: string | null;
  actorEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  changes: { before?: Record<string, unknown>; after?: Record<string, unknown> };
  ip: string | null;
  createdAt: string;
}

/** Shape returned by /api/auth/me, drives what the dashboard shows. */
export interface CurrentAdmin {
  _id: string;
  id: string;
  email: string;
  name: string;
  roleName: string | null;
  permissions: string[];
  lastLoginAt?: string | null;
}

/* ---------- editable pages (About, Contact, policies...) ---------- */

export type PageTemplate = 'standard' | 'legal' | 'contact';

interface SectionBase {
  /** Client-made key so React keeps editors stable while blocks move. */
  id?: string;
  eyebrow?: string;
  heading?: string;
}

/** Body text in the blog's Markdown subset. */
export interface TextSection extends SectionBase {
  type: 'text';
  body: string;
}

export interface ImageTextSection extends SectionBase {
  type: 'imageText';
  body: string;
  images: ApiImage[];
  imageSide: 'left' | 'right';
}

export interface CardItem {
  eyebrow?: string;
  title: string;
  body?: string;
  href?: string;
  linkLabel?: string;
}

export interface CardsSection extends SectionBase {
  type: 'cards';
  tone: 'light' | 'dark';
  items: CardItem[];
}

/** Published FAQs from the FAQs screen; a blank group lists them all. */
export interface FaqSection extends SectionBase {
  type: 'faq';
  group: '' | Faq['group'];
}

export interface CtaSection extends SectionBase {
  type: 'cta';
  body?: string;
  ctaLabel: string;
  ctaHref: string;
  tone: 'light' | 'dark';
}

export type PageSection = TextSection | ImageTextSection | CardsSection | FaqSection | CtaSection;
export type PageSectionType = PageSection['type'];

export interface ContactEmail {
  label: string;
  address: string;
}

export interface ContactPhone {
  label: string;
  number: string;
  whatsapp: boolean;
}

export interface ContactOffice {
  name: string;
  lines: string[];
  hours?: string;
  mapUrl?: string;
}

/** The contact template's own settings, as stored. Empty lists fall back to Site settings. */
export interface PageContact {
  emails: ContactEmail[];
  phones: ContactPhone[];
  offices: ContactOffice[];
  hours: string;
  socials: SiteSettings['socials'];
  showForm: boolean;
  formHeading: string;
}

export interface CmsPage {
  _id: string;
  id: string;
  title: string;
  slug: string;
  template: PageTemplate;
  eyebrow: string;
  subtitle: string;
  heroImage: ApiImage | null;
  body: string;
  sections: PageSection[];
  contact: Partial<PageContact>;
  /** Contact template only: the page's details with Site settings filling the gaps. */
  contactDetails: PageContact | null;
  seo?: Seo | null;
  showInFooter: boolean;
  order: number;
  status: Status;
  isSample?: boolean;
  sourceNote?: string | null;
  createdAt: string;
  updatedAt: string;
}
