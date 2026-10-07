import type { Metadata } from 'next';
import { Aref_Ruqaa, Jost } from 'next/font/google';
import './globals.css';

/*
 * The live Clada Safari Bliss site's own faces. Aref Ruqaa for headings: its
 * heading face is "Aref Ruqaa Ink", the same letterforms as a colour font,
 * which ignores the text colour in some browsers, so the plain cut is used.
 * It ships in 400 and 700 only; headings use 700.
 * Jost for text: the live site's accent face, and far easier to read at small
 * sizes (cards, forms, the dashboard) than a display serif.
 */
const display = Aref_Ruqaa({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-display-face',
  display: 'swap',
});

const sans = Jost({
  subsets: ['latin'],
  variable: '--font-sans-face',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'),
  title: {
    default: 'Clada Safari Bliss: safaris, Kenyan holidays, getaways and international packages',
    template: '%s | Clada Safari Bliss',
  },
  description:
    'Tailor-made safaris in Kenya and Tanzania, Kenyan coast holidays, weekend getaways and international packages from Clada Safari Bliss, Nairobi.',
  openGraph: {
    type: 'website',
    siteName: 'Clada Safari Bliss',
    images: [{ url: '/images/clada-2026-09-pexels-redrum-visuals-5819228-scaled.jpg' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      {/* Browser extensions (e.g. Grammarly) add attributes to <body> before hydration. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
