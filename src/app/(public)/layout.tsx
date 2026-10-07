import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ContactLauncher } from '@/components/layout/ContactLauncher';
import { WhatsAppWidget } from '@/components/common/WhatsAppWidget';
import { apiListSafe } from '@/lib/api';
import { whatsappNumber } from '@/lib/format';
import { getSettings } from '@/lib/settings';
import { getAreas, getCategories } from '@/lib/catalog';
import { getFooterPages } from '@/lib/pages';
import { needsAreas, needsDestinations, resolveNavigation, toHeaderNav } from '@/lib/navigation';
import { TAGS } from '@/lib/tags';
import type { Destination } from '@/types';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories, footerPages] = await Promise.all([getSettings(), getCategories(), getFooterPages()]);

  // The menu arranged in the dashboard, or the automatic one built from the
  // category tree until someone arranges it. Linked items resolve against the
  // live catalogue; each fetch carries its own tags, so renaming a category
  // or adding an area refreshes the menu too.
  const menu = resolveNavigation(settings.navigation, categories);
  const [areas, destinations] = await Promise.all([
    needsAreas(menu) ? getAreas() : [],
    needsDestinations(menu)
      ? apiListSafe<Destination>('/api/destinations?limit=100', { tags: [TAGS.destinations] }).then((r) => r.items)
      : [],
  ]);
  const nav = toHeaderNav(menu, { categories, areas, destinations });
  // Null when WhatsApp chat is switched off in Site settings.
  const whatsapp = whatsappNumber(settings);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        nav={nav}
        phone={settings.contact.phone}
        whatsapp={settings.contact.whatsapp}
        logo={settings.brand.logoCompact}
        socials={settings.socials}
      />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} categories={categories} pages={footerPages} />
      {/* With the WhatsApp widget on, the launcher stacks above it and leaves WhatsApp to it. */}
      <ContactLauncher
        phone={settings.contact.phone}
        whatsapp={whatsapp ? undefined : settings.contact.whatsapp}
        email={settings.contact.email}
        stacked={Boolean(whatsapp)}
      />
      {whatsapp ? (
        <WhatsAppWidget
          number={whatsapp}
          greeting={settings.whatsappWidget.greeting}
          quickReplies={settings.whatsappWidget.quickReplies}
          businessName={settings.brand.name}
          avatarUrl={settings.brand.mark.url}
        />
      ) : null}
    </div>
  );
}
