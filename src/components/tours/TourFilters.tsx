'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { Category, CountryInfo, Destination, TravelArea } from '@/types';

const SORTS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'duration-asc', label: 'Shortest first' },
  { value: 'newest', label: 'Newest' },
] as const;

/**
 * Product-line tabs (from the category tree), a second row for the chosen
 * line's sub-categories, country chips, search and sort. Every option comes
 * from the API, so new categories and countries appear without a deploy.
 */
export function TourFilters({
  total,
  categories,
  countries,
  area,
  destination,
}: {
  total: number;
  categories: Category[];
  countries: CountryInfo[];
  /** The travel area in the URL (?area=), reached from the homepage tabs. */
  area?: TravelArea;
  /** The destination in the URL (?destination=), reached from a destination page. */
  destination?: Destination | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  const setParams = useCallback(
    (changes: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      next.delete('page'); // any filter change returns to the first page
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  const category = params.get('category') ?? '';
  const country = params.get('country') ?? '';
  const sort = params.get('sort') ?? 'recommended';
  const hasFilters = Boolean(category || country || params.get('q') || params.get('area') || params.get('destination'));

  const activeGroup = categories.find(
    (g) => g.slug === category || g.children?.some((c) => c.slug === category)
  );
  const visibleCountries = countries.filter((c) => (c.tourCount ?? 0) > 0);

  const tab = (active: boolean) =>
    `rounded-full px-5 py-2.5 text-sm transition-all duration-300 ${
      active ? 'bg-charcoal-900 text-cream-50' : 'border border-cream-300 bg-white text-charcoal-900 hover:border-charcoal-900'
    }`;
  const chip = (active: boolean) =>
    `rounded-full px-4 py-2 text-xs uppercase tracking-wider transition-all duration-300 ${
      active ? 'bg-gold-500 text-charcoal-950' : 'bg-cream-200 text-muted hover:bg-cream-300'
    }`;

  return (
    <div className="mb-10 space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type of trip">
        <button type="button" onClick={() => setParams({ category: '' })} aria-pressed={!category} className={tab(!category)}>
          All trips
        </button>
        {categories.map((g) => (
          <button
            key={g.slug}
            type="button"
            onClick={() => setParams({ category: g.slug })}
            aria-pressed={activeGroup?.slug === g.slug}
            className={tab(activeGroup?.slug === g.slug)}
          >
            {g.navLabel || g.name}
          </button>
        ))}
      </div>

      {activeGroup && (activeGroup.children?.length ?? 0) > 1 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label={`Filter ${activeGroup.name}`}>
          <button type="button" onClick={() => setParams({ category: activeGroup.slug })} aria-pressed={category === activeGroup.slug} className={chip(category === activeGroup.slug)}>
            All {activeGroup.name}
          </button>
          {activeGroup.children!.map((c) => (
            <button key={c.slug} type="button" onClick={() => setParams({ category: c.slug })} aria-pressed={category === c.slug} className={chip(category === c.slug)}>
              {c.name}
            </button>
          ))}
        </div>
      ) : null}

      {area ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted">Area</span>
          <button
            type="button"
            onClick={() => setParams({ area: '' })}
            aria-label={`Remove the ${area.name} filter`}
            className={`${chip(true)} inline-flex items-center gap-2`}
          >
            {area.parent ? `${area.parent.name} · ` : ''}
            {area.name}
            <span aria-hidden>×</span>
          </button>
        </div>
      ) : null}

      {destination ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted">Destination</span>
          <button
            type="button"
            onClick={() => setParams({ destination: '' })}
            aria-label={`Remove the ${destination.name} filter`}
            className={`${chip(true)} inline-flex items-center gap-2`}
          >
            {destination.name}
            <span aria-hidden>×</span>
          </button>
        </div>
      ) : null}

      {visibleCountries.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by country">
          <button type="button" onClick={() => setParams({ country: '' })} aria-pressed={!country} className={chip(!country)}>
            All countries
          </button>
          {visibleCountries.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setParams({ country: c.name })}
              aria-pressed={country === c.name}
              className={chip(country === c.name)}
            >
              {c.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-cream-300 pt-5">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ q: q.trim() });
          }}
          className="flex min-w-[240px] flex-1 items-center gap-2 rounded-full border border-cream-300 bg-white px-4 py-2 sm:max-w-sm"
        >
          <label htmlFor="tour-search" className="sr-only">
            Search packages
          </label>
          <input
            id="tour-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: Mara, Diani, Dubai…"
            className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
          />
          <button type="submit" className="text-xs font-medium text-leaf-700 hover:text-leaf-500">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-4">
          <p className="text-sm text-muted" aria-live="polite">
            {total} {total === 1 ? 'package' : 'packages'}
            {hasFilters ? ' match' : ''}
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setQ('');
                router.push(pathname, { scroll: false });
              }}
              className="text-sm text-muted underline transition-colors hover:text-charcoal-900"
            >
              Clear filters
            </button>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-muted">
            <span className="sr-only sm:not-sr-only">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setParams({ sort: e.target.value })}
              className="rounded-full border border-cream-300 bg-white px-4 py-2 text-sm text-charcoal-900 focus:border-gold-500 focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
