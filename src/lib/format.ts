/** A package with no price yet: quoted when the customer asks. */
export const PRICE_ON_REQUEST = 'Price on request';

/** False for a package whose price is 0, i.e. not set. */
export const hasPrice = (amount: number | null | undefined): amount is number => Number(amount) > 0;

/**
 * Local packages and getaways are priced in shillings and everything else in
 * US dollars: "KSh 24,500" and "$1,650". USD is formatted en-US so it reads
 * "$1,650" rather than "US$1,650". A price of 0 means none has been set, and
 * reads "Price on request" rather than "$0".
 */
export function formatPrice(amount: number, currency = 'KES'): string {
  if (!hasPrice(amount)) return PRICE_ON_REQUEST;
  if (currency === 'KES') {
    // Written "KSh 24,500"; Intl's en-KE gives "Ksh".
    return `KSh ${new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 }).format(amount)}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDuration(days: number, nights?: number): string {
  if (days === 1) return 'Day trip';
  const n = nights ?? Math.max(0, days - 1);
  return `${days} days / ${n} nights`;
}

/** "+254 700 000 000" -> "+254700000000", for tel: links. */
export function telHref(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/** A wa.me chat link, optionally with the first message typed in for the visitor. */
export function whatsappHref(phone: string, text?: string): string {
  const base = `https://wa.me/${phone.replace(/[^\d]/g, '')}`;
  return text?.trim() ? `${base}?text=${encodeURIComponent(text.trim())}` : base;
}

/**
 * The number WhatsApp chats go to, or null when chat is switched off in Site
 * settings. The widget's own number wins, then the contact WhatsApp number,
 * then the main phone line.
 */
export function whatsappNumber(settings: {
  contact: { phone: string; whatsapp?: string };
  whatsappWidget?: { enabled: boolean; number?: string };
}): string | null {
  if (settings.whatsappWidget && !settings.whatsappWidget.enabled) return null;
  const number = settings.whatsappWidget?.number?.trim() || settings.contact.whatsapp?.trim() || settings.contact.phone.trim();
  return number.replace(/\D/g, '').length >= 7 ? number : null;
}

/**
 * The second contact number, or undefined when there is nothing extra to show.
 *
 * Compared on digits alone: the same number stored as "+254700000000" in one
 * field and "+254 700 000 000" in the other is one number, and listing it
 * twice looks like a mistake to a visitor.
 */
export function secondaryNumber(phone: string, whatsapp?: string): string | undefined {
  if (!whatsapp) return undefined;
  const digits = (v: string) => v.replace(/\D/g, '');
  return digits(whatsapp) === digits(phone) ? undefined : whatsapp;
}

/** "Kenya · Tanzania" style place line for a tour card. */
export function tourPlace(tour: { locationLabel?: string | null; countries: string[] }): string {
  return tour.locationLabel || tour.countries.join(' · ') || 'East Africa';
}
