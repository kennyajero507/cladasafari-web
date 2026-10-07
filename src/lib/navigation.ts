import type { NavItem } from '@/components/layout/Header';
import type { Category, Destination, NavMenuItem, NavSource, TravelArea } from '@/types';

/** The live records linked menu items resolve against. */
export interface NavCatalog {
  categories: Category[];
  areas: TravelArea[];
  destinations: Pick<Destination, 'slug' | 'name'>[];
}

/** A menu item as it will render: title, route and dropdown settled. */
export interface ResolvedNavItem {
  label: string;
  href: string;
  children: Array<{ label: string; href: string; image?: { url: string } }>;
}

const flatten = <T extends { children?: T[] }>(tree: T[]): T[] => tree.flatMap((n) => [n, ...flatten(n.children ?? [])]);

/**
 * What a catalogue record contributes to the menu: its name, its route, and
 * a dropdown of its sub-categories (or, for a region, the areas that have
 * tours). A category's dropdown lists its places and nothing else, as the
 * Clada Safari Bliss menu always has: the group's own name is the link to
 * everything in it. Null when the record is gone or unpublished, so a deleted
 * category drops out of the menu rather than leaving a dead link.
 */
export function describeSource(source: NavSource, catalog: NavCatalog): ResolvedNavItem | null {
  if (source.type === 'category') {
    const category = flatten(catalog.categories).find((c) => c.slug === source.slug);
    if (!category) return null;
    const href = `/tours?category=${category.slug}`;
    const children = category.children ?? [];
    return {
      label: category.navLabel || category.name,
      href,
      children: children.map((c) => ({ label: c.navLabel || c.name, href: `/tours?category=${c.slug}` })),
    };
  }

  if (source.type === 'area') {
    const area = flatten(catalog.areas).find((a) => a.slug === source.slug);
    if (!area) return null;
    const href = `/tours?area=${area.slug}`;
    // Areas without a published tour would lead to an empty listing.
    const children = (area.children ?? []).filter((a) => (a.tourCount ?? 0) > 0);
    return {
      label: area.name,
      href,
      children: children.map((a) => ({ label: a.name, href: `/tours?area=${a.slug}` })),
    };
  }

  const destination = catalog.destinations.find((d) => d.slug === source.slug);
  return destination ? { label: destination.name, href: `/destinations/${destination.slug}`, children: [] } : null;
}

/**
 * Settles one item: linked items take their route and dropdown from the
 * catalogue and their name unless a custom title is set; plain items are used
 * as written, minus hidden dropdown links.
 */
export function resolveItem(item: NavMenuItem, catalog: NavCatalog): ResolvedNavItem | null {
  if (item.source) {
    const described = describeSource(item.source, catalog);
    if (!described) return null;
    return {
      label: item.label.trim() || described.label,
      href: described.href,
      children: item.showChildren === false ? [] : described.children,
    };
  }
  return {
    label: item.label,
    href: item.href,
    children: item.children
      .filter((c) => c.visible)
      .map((c) => ({ label: c.label, href: c.href, image: c.image?.url ? { url: c.image.url } : undefined })),
  };
}

/**
 * The automatic menu, used until an admin arranges one (settings.navigation is
 * empty). It is the Clada Safari Bliss menu as it has always been: Home, the
 * four package groups with their places (Local, Getaways, International,
 * Safari Packages), Air Ticketing, then About Us and Contact Us. The previous
 * site split these across two bars; here they share one.
 *
 * The groups are linked items, so their names, order and dropdowns follow the
 * category tree even after this menu is saved.
 *
 * The dashboard's Navigation menu screen starts from this too, so "arrange"
 * begins with what visitors see today rather than a blank list.
 */
export function defaultNavigation(categories: Category[]): NavMenuItem[] {
  const plain = (id: string, label: string, href: string): NavMenuItem => ({ id, label, href, visible: true, children: [] });

  return [
    plain('home', 'Home', '/'),
    ...categories.map(
      (group): NavMenuItem => ({
        id: `category-${group.slug}`,
        label: '',
        href: '',
        visible: true,
        children: [],
        source: { type: 'category', slug: group.slug },
        showChildren: true,
      })
    ),
    plain('air-ticketing', 'Air Ticketing', '/air-ticketing'),
    plain('about', 'About Us', '/about'),
    plain('contact', 'Contact Us', '/contact'),
  ];
}

/**
 * What the header renders: hidden and unresolvable entries dropped. A
 * /tours?... link carries its query as `match`, so the header can tell product
 * lines apart on /tours.
 */
export function toHeaderNav(menu: NavMenuItem[], catalog: NavCatalog): NavItem[] {
  return menu
    .filter((item) => item.visible)
    .map((item) => resolveItem(item, catalog))
    .filter((item): item is ResolvedNavItem => item !== null)
    .map((item) => ({
      href: item.href,
      label: item.label,
      match: item.href.startsWith('/tours?') ? item.href.slice('/tours?'.length) : undefined,
      items: item.children.length ? item.children : undefined,
    }));
}

/** The arranged menu if there is one, otherwise the automatic one. */
export function resolveNavigation(saved: NavMenuItem[] | undefined, categories: Category[]): NavMenuItem[] {
  return saved?.length ? saved : defaultNavigation(categories);
}

/** Whether rendering this menu needs the destination list. */
export const needsDestinations = (menu: NavMenuItem[]) => menu.some((item) => item.source?.type === 'destination');

/** Whether rendering this menu needs the travel area tree. */
export const needsAreas = (menu: NavMenuItem[]) => menu.some((item) => item.source?.type === 'area');
