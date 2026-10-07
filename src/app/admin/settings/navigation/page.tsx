'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { useUnsavedChangesGuard } from '@/lib/useUnsavedChanges';
import { defaultNavigation, describeSource, resolveItem, toHeaderNav, type NavCatalog } from '@/lib/navigation';
import { Header } from '@/components/layout/Header';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { FormError } from '@/components/admin/FormError';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toasts';
import type { Category, Destination, NavMenuItem, NavMenuLink, NavSource, SiteSettings, TravelArea } from '@/types';

/** Mirrors the caps in the API's NavItemSchema / NavLinkSchema. */
const MAX_ITEMS = 10;
const MAX_CHILDREN = 12;
const LABEL_MAX = 40;
const HREF_MAX = 200;

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 14);

function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Same rule as the API: a path on this site, or a full web, mail or phone link. */
function hrefProblem(href: string): string | null {
  const value = href.trim();
  if (!value) return 'Every menu item needs a link.';
  if (value.startsWith('/') && !value.startsWith('//')) return null;
  if (/^(https?:\/\/|mailto:|tel:)\S+$/.test(value)) return null;
  return 'Use a path on this site, such as /tours, or a full https:// address.';
}

function validate(menu: NavMenuItem[], catalog: NavCatalog): Record<string, string> {
  const errors: Record<string, string> = {};
  const check = (path: string, entry: { label: string; href: string }) => {
    if (!entry.label.trim()) errors[`${path}.label`] = 'Every menu item needs a title.';
    const problem = hrefProblem(entry.href);
    if (problem) errors[`${path}.href`] = problem;
  };
  menu.forEach((item, i) => {
    if (item.source) {
      // Title and link are inherited; only the record itself has to exist.
      if (!describeSource(item.source, catalog)) {
        errors[`navigation.${i}.source.slug`] = `That ${item.source.type} no longer exists or is not published.`;
      }
      return;
    }
    check(`navigation.${i}`, item);
    item.children.forEach((child, j) => check(`navigation.${i}.children.${j}`, child));
  });
  return errors;
}

/** Trims text and drops empty thumbnails so what is saved is what is shown. */
function clean(menu: NavMenuItem[]): NavMenuItem[] {
  return menu.map((item) => ({
    ...item,
    label: item.label.trim(),
    // A linked item's route and dropdown come from the catalogue at render time.
    href: item.source ? '' : item.href.trim(),
    source: item.source ?? null,
    showChildren: item.showChildren ?? true,
    children: (item.source ? [] : item.children).map((child) => ({
      ...child,
      label: child.label.trim(),
      href: child.href.trim(),
      image: child.image?.url ? { url: child.image.url, alt: child.image.alt ?? '' } : null,
    })),
  }));
}

/** A catalogue record offered in the pickers; `value` is "type:slug". */
interface LinkTarget {
  value: string;
  group: 'Categories' | 'Regions' | 'Destinations';
  /** Indented for sub-categories and areas. */
  option: string;
  label: string;
  href: string;
}

function linkTargets(catalog: NavCatalog): LinkTarget[] {
  const out: LinkTarget[] = [];
  for (const group of catalog.categories) {
    out.push({ value: `category:${group.slug}`, group: 'Categories', option: group.name, label: group.navLabel || group.name, href: `/tours?category=${group.slug}` });
    for (const child of group.children ?? []) {
      out.push({ value: `category:${child.slug}`, group: 'Categories', option: `— ${child.name}`, label: child.navLabel || child.name, href: `/tours?category=${child.slug}` });
    }
  }
  const areaTarget = (a: TravelArea, indent: boolean): LinkTarget => ({
    value: `area:${a.slug}`,
    group: 'Regions',
    option: `${indent ? '— ' : ''}${a.name}${a.tourCount ? '' : ' (no packages yet)'}`,
    label: a.name,
    href: `/tours?area=${a.slug}`,
  });
  for (const region of catalog.areas) {
    out.push(areaTarget(region, false));
    for (const area of region.children ?? []) out.push(areaTarget(area, true));
  }
  for (const d of catalog.destinations) {
    out.push({ value: `destination:${d.slug}`, group: 'Destinations', option: d.name, label: d.name, href: `/destinations/${d.slug}` });
  }
  return out;
}

const parseTarget = (value: string): NavSource | null => {
  const [type, slug] = value.split(':');
  return type && slug ? { type: type as NavSource['type'], slug } : null;
};

function TargetOptions({ targets }: { targets: LinkTarget[] }) {
  return (
    <>
      {(['Categories', 'Regions', 'Destinations'] as const).map((group) => {
        const options = targets.filter((t) => t.group === group);
        return options.length ? (
          <optgroup key={group} label={group}>
            {options.map((t) => (
              <option key={t.value} value={t.value}>
                {t.option}
              </option>
            ))}
          </optgroup>
        ) : null;
      })}
    </>
  );
}

type DragState = { parent: number | null; index: number } | null;

/** Props for a reorderable row: `row` goes on the <li>, `handle` on its grip. */
type RowDrag = {
  handle: { onPointerDown: () => void; onPointerUp: () => void };
  row: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
};

/**
 * Arrange the public site's main menu: order (drag, or the arrow buttons for
 * keyboard and touch), titles, links, visibility, and thumbnails for dropdown
 * links. The preview above the editor is the real site header, fed the draft.
 *
 * Until something is saved the site builds its menu from the category tree;
 * this screen starts from that automatic menu so arranging begins with what
 * visitors see today. "Return to automatic" clears the saved menu again.
 */
export default function NavigationMenuPage() {
  const [menu, setMenu] = useState<NavMenuItem[] | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [areas, setAreas] = useState<TravelArea[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [automatic, setAutomatic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<DragState>(null);
  const [dropTarget, setDropTarget] = useState<DragState>(null);
  // Only the grip starts a drag. A draggable row would otherwise hijack text
  // selection inside its inputs.
  const [armed, setArmed] = useState<string | null>(null);

  const initial = useRef<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const { toast } = useToast();

  useEffect(() => {
    // The public lists, so linked items resolve here exactly as on the site.
    Promise.all([
      adminApi.get<SiteSettings>('/api/settings'),
      adminApi.get<Category[]>('/api/categories').catch(() => []),
      adminApi.get<TravelArea[]>('/api/areas').catch(() => []),
      adminApi
        .list<Destination>('/api/destinations?limit=100')
        .then(({ items }) => items)
        .catch(() => []),
    ])
      .then(([loaded, cats, areaTree, dests]) => {
        const saved = loaded.navigation ?? [];
        const start = saved.length ? saved : defaultNavigation(cats);
        setSettings(loaded);
        setCategories(cats);
        setAreas(areaTree);
        setDestinations(dests);
        setAutomatic(saved.length === 0);
        setMenu(start);
        initial.current = JSON.stringify(start);
      })
      .catch((err) => setError(err instanceof AdminApiError ? err.message : 'Could not load the menu.'))
      .finally(() => setLoading(false));
  }, []);

  const dirty = initial.current !== null && menu !== null && JSON.stringify(menu) !== initial.current;
  useUnsavedChangesGuard(dirty && !saving);

  const update = (next: (current: NavMenuItem[]) => NavMenuItem[]) => {
    setMenu((current) => (current ? next(current) : current));
    setFieldErrors({});
  };
  const patchItem = (i: number, changes: Partial<NavMenuItem>) =>
    update((m) => m.map((item, k) => (k === i ? { ...item, ...changes } : item)));
  const patchChild = (i: number, j: number, changes: Partial<NavMenuLink>) =>
    update((m) =>
      m.map((item, k) =>
        k === i ? { ...item, children: item.children.map((c, l) => (l === j ? { ...c, ...changes } : c)) } : item
      )
    );
  const catalog: NavCatalog = { categories, areas, destinations };
  const targets = linkTargets(catalog);

  /** Links an item to a catalogue record, or back to a plain link written by hand. */
  function setSource(i: number, value: string) {
    const source = parseTarget(value);
    if (source) {
      // A blank title inherits the record's name; a new link starts from it.
      patchItem(i, { source, label: '', showChildren: true });
      return;
    }
    unlink(i);
  }

  /** Turns a linked item into a plain one holding a copy of what it showed, ready to edit. */
  function unlink(i: number) {
    const item = menu![i];
    const resolved = resolveItem(item, catalog);
    patchItem(i, {
      source: null,
      label: resolved?.label ?? item.label,
      href: resolved?.href ?? item.href,
      children: (resolved?.children ?? []).map((c) => ({ id: newId(), label: c.label, href: c.href, visible: true, image: null })),
    });
  }

  const moveItem = (from: number, to: number) => update((m) => move(m, from, to));
  const moveChild = (i: number, from: number, to: number) =>
    update((m) => m.map((item, k) => (k === i ? { ...item, children: move(item.children, from, to) } : item)));

  function toggleExpanded(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addItem() {
    const id = newId();
    update((m) => [...m, { id, label: 'New item', href: '/', visible: true, children: [] }]);
    setExpanded((s) => new Set(s).add(id));
  }

  function addChild(i: number) {
    update((m) =>
      m.map((item, k) =>
        k === i
          ? { ...item, children: [...item.children, { id: newId(), label: 'New link', href: item.href, visible: true, image: null }] }
          : item
      )
    );
    setExpanded((s) => new Set(s).add(menu![i].id));
  }

  async function removeItem(i: number) {
    const item = menu![i];
    if (item.children.length) {
      const ok = await confirm({
        title: `Remove “${item.label || 'this item'}”?`,
        body: `Its dropdown of ${item.children.length} ${item.children.length === 1 ? 'link' : 'links'} goes with it. Nothing changes on the site until you save.`,
        confirmLabel: 'Remove',
      });
      if (!ok) return;
    }
    update((m) => m.filter((_, k) => k !== i));
  }

  /* Native drag and drop. Rows only reorder within their own list: top-level
     entries among themselves, dropdown links within their dropdown. */
  function dragProps(parent: number | null, index: number, id: string): RowDrag {
    const same = (d: DragState) => d !== null && d.parent === parent;
    return {
      handle: {
        onPointerDown: () => setArmed(id),
        onPointerUp: () => setArmed(null),
      },
      row: {
        draggable: armed === id,
        onDragStart: (e: React.DragEvent) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = 'move';
          // Firefox will not start a drag without data.
          e.dataTransfer.setData('text/plain', String(index));
          setDrag({ parent, index });
        },
        onDragOver: (e: React.DragEvent) => {
          if (!same(drag)) return;
          e.preventDefault();
          e.stopPropagation();
          if (dropTarget?.parent !== parent || dropTarget.index !== index) setDropTarget({ parent, index });
        },
        onDrop: (e: React.DragEvent) => {
          if (!same(drag)) return;
          e.preventDefault();
          e.stopPropagation();
          if (parent === null) moveItem(drag!.index, index);
          else moveChild(parent, drag!.index, index);
          setDrag(null);
          setDropTarget(null);
        },
        onDragEnd: () => {
          setDrag(null);
          setDropTarget(null);
          setArmed(null);
        },
      },
    };
  }

  const rowState = (parent: number | null, index: number) => {
    const dragging = drag?.parent === parent && drag.index === index;
    const target = !dragging && dropTarget?.parent === parent && dropTarget.index === index;
    return `${dragging ? 'opacity-40' : ''} ${target ? 'ring-2 ring-gold-500' : ''}`;
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!menu) return;
    const cleaned = clean(menu);
    const problems = validate(cleaned, catalog);
    if (Object.keys(problems).length) {
      setFieldErrors(problems);
      setError('Some menu items need attention before saving.');
      // Open the dropdowns holding a problem so the field can take focus.
      setExpanded((s) => {
        const next = new Set(s);
        for (const key of Object.keys(problems)) {
          const [, i, kind] = key.split('.');
          if (kind === 'children') next.add(cleaned[Number(i)].id);
        }
        return next;
      });
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await adminApi.patch<SiteSettings>('/api/admin/settings', { navigation: cleaned });
      setMenu(updated.navigation);
      initial.current = JSON.stringify(updated.navigation);
      setAutomatic(false);
      toast({ message: 'Menu saved. The public site updates within moments.' });
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
        if (err.details) setFieldErrors(err.details);
      } else {
        setError('Could not save the menu.');
      }
      toast({ tone: 'error', message: 'The menu could not be saved.' });
    } finally {
      setSaving(false);
    }
  }

  async function returnToAutomatic() {
    const ok = await confirm({
      title: 'Return to the automatic menu?',
      body: 'The arranged menu is discarded and the site goes back to building its menu from your categories, so new categories appear on their own again.',
      confirmLabel: 'Use automatic menu',
    });
    if (!ok) return;
    setSaving(true);
    try {
      await adminApi.patch<SiteSettings>('/api/admin/settings', { navigation: [] });
      const start = defaultNavigation(categories);
      setMenu(start);
      initial.current = JSON.stringify(start);
      setAutomatic(true);
      setFieldErrors({});
      setError('');
      toast({ message: 'The site is using the automatic menu again.' });
    } catch (err) {
      toast({ tone: 'error', message: err instanceof AdminApiError ? err.message : 'Could not reset the menu.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-cream-200" />
        <div className="h-64 animate-pulse rounded-card bg-white" />
        <div className="h-96 animate-pulse rounded-card bg-white" />
      </div>
    );
  }

  if (!menu || !settings) {
    return (
      <p role="alert" className="rounded-lg bg-maroon-600/10 px-4 py-3 text-sm text-maroon-700">
        {error || 'The menu is unavailable.'}
      </p>
    );
  }

  const input = (bad?: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
      bad ? 'border-maroon-600' : 'border-cream-300 focus:border-gold-500'
    }`;
  const iconButton =
    'flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-cream-100 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted">
            <Link href="/admin/settings" className="underline hover:text-ink">
              Site settings
            </Link>{' '}
            › Navigation menu
          </p>
          <h1 className="mt-1 text-3xl">Arrange navigation menu</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Drag entries to reorder them, rename them, hide them without deleting, and add thumbnails to dropdown
            links. Link an entry to a category, region or destination and it follows it: title, route and
            dropdown stay in step with the catalogue. The preview shows the draft; the public site changes when
            you save.
          </p>
        </div>
      </header>

      <p
        role="status"
        className={`mb-5 rounded-lg px-4 py-3 text-sm ${automatic ? 'bg-gold-50 text-gold-700' : 'bg-leaf-100 text-leaf-700'}`}
      >
        {automatic
          ? 'The site is using the automatic menu, built from your categories. Once you save, the menu is as arranged here: linked entries still follow their category, but new top-level categories need adding by hand.'
          : 'The site is using this arranged menu.'}
      </p>

      <div className="mb-5">
        <FormError message={error} fieldErrors={fieldErrors} />
      </div>

      <section className="mb-5 overflow-hidden rounded-card border border-cream-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-6 pt-5">
          <h2 className="text-lg">Live preview</h2>
          <p className="text-xs text-muted">Links are disabled here. The full bar shows on windows 1280px and wider.</p>
        </div>
        {/* The transform makes this box the containing block for the header's
            position: fixed, so the real component renders in place rather
            than over the dashboard. Clicks on links are swallowed. */}
        <div
          className="relative mt-4 h-[340px] overflow-hidden bg-charcoal-900 [transform:translateZ(0)]"
          onClickCapture={(e) => {
            if ((e.target as HTMLElement).closest('a')) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {settings.heroSlides?.[0]?.url ? (
            <Image src={settings.heroSlides[0].url} alt="" fill sizes="1200px" className="object-cover opacity-70" />
          ) : null}
          <Header
            nav={toHeaderNav(menu, catalog)}
            phone={settings.contact.phone}
            whatsapp={settings.contact.whatsapp}
            logo={settings.brand.logoCompact}
          />
        </div>
      </section>

      <form onSubmit={save}>
        <section className="rounded-card border border-cream-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg">Menu items</h2>
              <p className="mt-1 text-sm text-muted">
                Top to bottom here is left to right on the site. Entries with links underneath open a dropdown.
              </p>
            </div>
            <span className="text-xs text-muted">
              {menu.length} of {MAX_ITEMS}
            </span>
          </div>

          <ol className="mt-5 space-y-3">
            {menu.map((item, i) => {
              const open = expanded.has(item.id);
              const base = `navigation.${i}`;
              const rowDrag = dragProps(null, i, item.id);
              // For a linked item: what the catalogue currently supplies.
              const linked = item.source ? describeSource(item.source, catalog) : null;
              const name = item.label || linked?.label || 'this item';
              const dropdownCount = item.source
                ? item.showChildren === false
                  ? 0
                  : (linked?.children.length ?? 0)
                : item.children.length;
              return (
                <li
                  key={item.id}
                  {...rowDrag.row}
                  className={`rounded-lg border border-cream-200 bg-cream-50 transition-shadow ${rowState(null, i)}`}
                >
                  <div className="flex flex-wrap items-start gap-2 p-3 md:flex-nowrap">
                    <span
                      aria-hidden
                      title="Drag to reorder"
                      {...rowDrag.handle}
                      className="mt-1.5 flex h-8 w-6 shrink-0 cursor-grab items-center justify-center text-muted active:cursor-grabbing"
                    >
                      <GripIcon />
                    </span>

                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                      <div className="sm:col-span-2">
                        <label htmlFor={`${base}.source.slug`} className="sr-only">
                          Links to
                        </label>
                        <select
                          id={`${base}.source.slug`}
                          name={`${base}.source.slug`}
                          value={item.source ? `${item.source.type}:${item.source.slug}` : ''}
                          onChange={(e) => setSource(i, e.target.value)}
                          aria-invalid={fieldErrors[`${base}.source.slug`] ? true : undefined}
                          className={`${input(fieldErrors[`${base}.source.slug`])} bg-white`}
                        >
                          <option value="">Custom link (written by hand)</option>
                          {/* A linked record that has since gone keeps an entry, so the select does not silently change. */}
                          {item.source && !linked ? (
                            <option value={`${item.source.type}:${item.source.slug}`}>
                              Missing {item.source.type}: {item.source.slug}
                            </option>
                          ) : null}
                          <TargetOptions targets={targets} />
                        </select>
                        <FieldError message={fieldErrors[`${base}.source.slug`]} />
                      </div>
                      <div>
                        <label htmlFor={`${base}.label`} className="sr-only">
                          Title
                        </label>
                        <input
                          id={`${base}.label`}
                          name={`${base}.label`}
                          value={item.label}
                          maxLength={LABEL_MAX}
                          placeholder={linked ? linked.label : 'Title'}
                          onChange={(e) => patchItem(i, { label: e.target.value })}
                          aria-invalid={fieldErrors[`${base}.label`] ? true : undefined}
                          aria-describedby={linked ? `${base}.label-hint` : undefined}
                          className={`${input(fieldErrors[`${base}.label`])} font-medium`}
                        />
                        {linked && !fieldErrors[`${base}.label`] ? (
                          <p id={`${base}.label-hint`} className="mt-1 text-xs text-muted">
                            {item.label ? 'Custom title.' : `Uses “${linked.label}”.`} Clear it to follow the {item.source!.type}.
                          </p>
                        ) : null}
                        <FieldError message={fieldErrors[`${base}.label`]} />
                      </div>
                      <div>
                        {item.source ? (
                          <p className="flex h-[38px] items-center gap-2 truncate rounded-lg border border-dashed border-cream-300 px-3 font-mono text-xs text-muted">
                            <span aria-hidden>↳</span>
                            {linked?.href ?? 'Not available'}
                          </p>
                        ) : (
                          <>
                            <label htmlFor={`${base}.href`} className="sr-only">
                              Link
                            </label>
                            <input
                              id={`${base}.href`}
                              name={`${base}.href`}
                              value={item.href}
                              maxLength={HREF_MAX}
                              placeholder="/tours?category=safaris"
                              onChange={(e) => patchItem(i, { href: e.target.value })}
                              aria-invalid={fieldErrors[`${base}.href`] ? true : undefined}
                              className={`${input(fieldErrors[`${base}.href`])} font-mono text-xs`}
                            />
                            <FieldError message={fieldErrors[`${base}.href`]} />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <VisibilitySwitch label={name} visible={item.visible} onChange={(visible) => patchItem(i, { visible })} />
                      <button type="button" onClick={() => moveItem(i, i - 1)} disabled={i === 0} aria-label={`Move ${name} up`} className={iconButton}>
                        <ArrowIcon up />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(i, i + 1)}
                        disabled={i === menu.length - 1}
                        aria-label={`Move ${name} down`}
                        className={iconButton}
                      >
                        <ArrowIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(item.id)}
                        aria-expanded={open}
                        className="h-8 rounded-lg px-2.5 text-xs text-leaf-700 transition-colors hover:bg-cream-100"
                      >
                        {item.source
                          ? `Dropdown (${dropdownCount ? `auto, ${dropdownCount}` : 'off'})`
                          : item.children.length
                            ? `Dropdown (${item.children.length})`
                            : 'Add dropdown'}
                      </button>
                      <button type="button" onClick={() => removeItem(i)} aria-label={`Remove ${name}`} className={`${iconButton} hover:text-maroon-600`}>
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  {open && item.source ? (
                    <div className="border-t border-cream-200 px-3 pb-3 pt-3 md:pl-11">
                      {linked && linked.children.length > 0 ? (
                        <>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-muted">
                              Follows the {item.source.type}: sub-items appear and disappear with it.
                            </p>
                            <label className="flex items-center gap-2 text-xs text-ink">
                              <VisibilitySwitch
                                label={`the dropdown for ${name}`}
                                visible={item.showChildren !== false}
                                onChange={(showChildren) => patchItem(i, { showChildren })}
                              />
                              Show dropdown
                            </label>
                          </div>
                          <ul className={`mb-3 flex flex-wrap gap-2 ${item.showChildren === false ? 'opacity-40' : ''}`}>
                            {linked.children.map((c) => (
                              <li key={c.href} className="rounded-full bg-white px-3 py-1 text-xs text-ink ring-1 ring-cream-200">
                                {c.label}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="mb-3 text-xs text-muted">
                          {linked ? `No sub-items: “${linked.label}” shows as a plain link.` : 'The linked record is missing.'}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => unlink(i)}
                        className="text-xs text-muted underline hover:text-ink"
                      >
                        Edit by hand instead (stops following the {item.source.type})
                      </button>
                    </div>
                  ) : null}

                  {open && !item.source ? (
                    <div className="border-t border-cream-200 px-3 pb-3 pt-3 md:pl-11">
                      {item.children.length === 0 ? (
                        <p className="mb-3 text-xs text-muted">
                          No dropdown: this entry is a plain link. Add links to turn it into a dropdown.
                        </p>
                      ) : (
                        <ol className="mb-3 space-y-2">
                          {item.children.map((child, j) => (
                            <ChildRow
                              key={child.id}
                              child={child}
                              base={`${base}.children.${j}`}
                              errors={fieldErrors}
                              first={j === 0}
                              last={j === item.children.length - 1}
                              rowClass={rowState(i, j)}
                              drag={dragProps(i, j, child.id)}
                              input={input}
                              iconButton={iconButton}
                              targets={targets}
                              onChange={(changes) => patchChild(i, j, changes)}
                              onMove={(to) => moveChild(i, j, to === 'up' ? j - 1 : j + 1)}
                              onRemove={() =>
                                update((m) =>
                                  m.map((it, k) => (k === i ? { ...it, children: it.children.filter((_, l) => l !== j) } : it))
                                )
                              }
                            />
                          ))}
                        </ol>
                      )}
                      {item.children.length < MAX_CHILDREN ? (
                        <button
                          type="button"
                          onClick={() => addChild(i)}
                          className="w-full rounded-lg border border-dashed border-cream-300 py-2 text-sm text-leaf-700 hover:border-gold-500"
                        >
                          + Add dropdown link
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>

          {menu.length < MAX_ITEMS ? (
            <button
              type="button"
              onClick={addItem}
              className="mt-3 w-full rounded-lg border border-dashed border-cream-300 py-2.5 text-sm text-leaf-700 hover:border-gold-500"
            >
              + Add menu item
            </button>
          ) : null}
        </section>

        <div className="sticky bottom-0 mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-cream-200 bg-cream-100/95 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="h-11 rounded-full bg-gold-500 px-8 text-sm font-medium text-charcoal-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save menu'}
            </button>
            {dirty && !saving ? <span className="text-xs text-muted">Unsaved changes</span> : null}
          </div>
          {!automatic ? (
            <button
              type="button"
              onClick={returnToAutomatic}
              disabled={saving}
              className="text-sm text-muted underline transition-colors hover:text-ink disabled:opacity-60"
            >
              Return to automatic menu
            </button>
          ) : null}
        </div>
      </form>

      {confirmDialog}
    </div>
  );
}

function ChildRow({
  child,
  base,
  errors,
  first,
  last,
  rowClass,
  drag,
  input,
  iconButton,
  targets,
  onChange,
  onMove,
  onRemove,
}: {
  targets: LinkTarget[];
  child: NavMenuLink;
  base: string;
  errors: Record<string, string>;
  first: boolean;
  last: boolean;
  rowClass: string;
  drag: RowDrag;
  input: (bad?: string) => string;
  iconButton: string;
  onChange: (changes: Partial<NavMenuLink>) => void;
  onMove: (direction: 'up' | 'down') => void;
  onRemove: () => void;
}) {
  const [editingImage, setEditingImage] = useState(false);

  return (
    <li {...drag.row} className={`rounded-lg border border-cream-200 bg-white ${rowClass}`}>
      <div className="flex flex-wrap items-start gap-2 p-2.5 md:flex-nowrap">
        <span
          aria-hidden
          title="Drag to reorder"
          {...drag.handle}
          className="mt-1.5 flex h-8 w-6 shrink-0 cursor-grab items-center justify-center text-muted active:cursor-grabbing"
        >
          <GripIcon />
        </span>

        <button
          type="button"
          onClick={() => setEditingImage((v) => !v)}
          aria-expanded={editingImage}
          aria-label={child.image?.url ? `Change the thumbnail for ${child.label}` : `Add a thumbnail for ${child.label}`}
          title={child.image?.url ? 'Change thumbnail' : 'Add thumbnail'}
          className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-cream-300 bg-cream-50 text-muted transition-colors hover:border-gold-500"
        >
          {child.image?.url ? (
            <Image src={child.image.url} alt="" fill sizes="36px" className="object-cover" />
          ) : (
            <span aria-hidden className="text-sm">
              +
            </span>
          )}
        </button>

        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
          <div>
            <label htmlFor={`${base}.label`} className="sr-only">
              Title
            </label>
            <input
              id={`${base}.label`}
              name={`${base}.label`}
              value={child.label}
              maxLength={LABEL_MAX}
              placeholder="Title"
              onChange={(e) => onChange({ label: e.target.value })}
              aria-invalid={errors[`${base}.label`] ? true : undefined}
              className={input(errors[`${base}.label`])}
            />
            <FieldError message={errors[`${base}.label`]} />
          </div>
          <div>
            <label htmlFor={`${base}.href`} className="sr-only">
              Link
            </label>
            <input
              id={`${base}.href`}
              name={`${base}.href`}
              value={child.href}
              maxLength={HREF_MAX}
              placeholder="/tours?category=locals"
              onChange={(e) => onChange({ href: e.target.value })}
              aria-invalid={errors[`${base}.href`] ? true : undefined}
              className={`${input(errors[`${base}.href`])} font-mono text-xs`}
            />
            <FieldError message={errors[`${base}.href`]} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Copies a record's name and route into this link once; edit freely after. */}
          <label className="sr-only" htmlFor={`${base}.fill`}>
            Fill {child.label} from a category, region or destination
          </label>
          <select
            id={`${base}.fill`}
            value=""
            onChange={(e) => {
              const target = targets.find((t) => t.value === e.target.value);
              if (target) onChange({ label: target.label, href: target.href });
            }}
            title="Fill from a category, region or destination"
            className="h-8 w-24 rounded-lg border border-cream-300 bg-white px-1.5 text-xs text-muted focus:border-gold-500 focus:outline-none"
          >
            <option value="">Fill from…</option>
            <TargetOptions targets={targets} />
          </select>
          <VisibilitySwitch label={child.label} visible={child.visible} onChange={(visible) => onChange({ visible })} />
          <button type="button" onClick={() => onMove('up')} disabled={first} aria-label={`Move ${child.label} up`} className={iconButton}>
            <ArrowIcon up />
          </button>
          <button type="button" onClick={() => onMove('down')} disabled={last} aria-label={`Move ${child.label} down`} className={iconButton}>
            <ArrowIcon />
          </button>
          <button type="button" onClick={onRemove} aria-label={`Remove ${child.label}`} className={`${iconButton} hover:text-maroon-600`}>
            <TrashIcon />
          </button>
        </div>
      </div>

      {editingImage ? (
        <div className="border-t border-cream-200 p-3">
          <ImageUploader
            label="Thumbnail (shown beside the link in the dropdown)"
            value={child.image?.url ? { url: child.image.url, alt: child.image.alt ?? '' } : undefined}
            onChange={(v) => onChange({ image: v?.url || v?.alt ? { url: v.url, alt: v.alt } : null })}
          />
        </div>
      ) : null}
    </li>
  );
}

function VisibilitySwitch({ label, visible, onChange }: { label: string; visible: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      aria-label={`Show ${label || 'this item'} on the site`}
      title={visible ? 'Shown on the site' : 'Hidden from the site'}
      onClick={() => onChange(!visible)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${visible ? 'bg-leaf-500' : 'bg-cream-300'}`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${visible ? 'left-[1.375rem]' : 'left-0.5'}`}
      />
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-maroon-600">{message}</p> : null;
}

function GripIcon() {
  return (
    <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor" aria-hidden>
      {[3, 9, 15].flatMap((y) => [<circle key={`a${y}`} cx="3" cy={y} r="1.5" />, <circle key={`b${y}`} cx="9" cy={y} r="1.5" />])}
    </svg>
  );
}

function ArrowIcon({ up = false }: { up?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d={up ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'} />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}
