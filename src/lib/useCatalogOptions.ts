'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from './adminApi';
import type { Category, CountryInfo, Destination, TravelArea } from '@/types';

/**
 * Builds the group > leaf tree from the dashboard's flat category list. The
 * public /api/categories tree holds published categories only, so a package in
 * a draft category used to open with no category selected, and saving it then
 * failed or moved it.
 */
export function buildCategoryTree(rows: Category[]): Category[] {
  const byOrder = (a: Category, b: Category) => a.order - b.order || a.name.localeCompare(b.name);
  const groups = rows.filter((c) => !c.parent).sort(byOrder);
  return groups.map((group) => ({
    ...group,
    children: rows.filter((c) => c.parent?.slug === group.slug).sort(byOrder),
  }));
}

/**
 * The lookup lists the package and destination forms need: the category tree
 * (drafts included), the countries, the travel areas, and every destination
 * (drafts included). `loading` is true until all four have arrived, so forms
 * can hold their selects rather than show an empty "Choose…".
 */
export function useCatalogOptions() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [areas, setAreas] = useState<TravelArea[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    let live = true;
    Promise.all([
      adminApi
        .list<Category>('/api/admin/categories?limit=100&sort=order-asc')
        .then(({ items }) => buildCategoryTree(items))
        // Roles without categories.view still get the published tree.
        .catch(() => adminApi.get<Category[]>('/api/categories').catch(() => [])),
      adminApi.get<CountryInfo[]>('/api/countries').catch(() => []),
      adminApi.get<TravelArea[]>('/api/areas').catch(() => []),
      adminApi
        .list<Destination>('/api/admin/destinations?limit=100&sort=name-asc')
        .then(({ items }) => items)
        .catch(() => []),
    ]).then(([c, k, a, d]) => {
      if (!live) return;
      setCategories(c);
      setCountries(k);
      setAreas(a);
      setDestinations(d);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  return { categories, countries, areas, destinations, loading };
}
