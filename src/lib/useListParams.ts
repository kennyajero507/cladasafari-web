'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Keeps admin list state, page, search, filter, sort, in the URL.
 *
 * Previously these lived in component state, so editing a tour from page 3 and
 * pressing Back returned to page 1, and a filtered view could not be
 * bookmarked or shared with a colleague.
 *
 * Defaults are omitted from the query string, so the common view stays a clean
 * /admin/tours rather than /admin/tours?page=1&sort=newest.
 */

export interface ListParamSpec {
  [key: string]: string;
}

export function useListParams<T extends ListParamSpec>(defaults: T) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Defaults are a literal at the call site; freezing the first one keeps the
  // memo below stable without asking every caller to useMemo.
  const defaultsRef = useRef(defaults);

  const params = useMemo(() => {
    const out = { ...defaultsRef.current } as T;
    for (const key of Object.keys(defaultsRef.current) as Array<keyof T & string>) {
      const value = searchParams.get(key);
      if (value !== null && value !== '') out[key] = value as T[keyof T & string];
    }
    return out;
  }, [searchParams]);

  const setParams = useCallback(
    (next: Partial<Record<keyof T & string, string>>, { replace = false } = {}) => {
      const query = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(next)) {
        const isDefault = value === undefined || value === '' || value === defaultsRef.current[key];
        if (isDefault) query.delete(key);
        else query.set(key, String(value));
      }

      // Any change to what is being listed restarts paging: staying on page 4
      // of a new search almost always lands on an empty result.
      if (!('page' in next) && Object.keys(next).length > 0) query.delete('page');

      const qs = query.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;

      // Typing in a search box should not push a history entry per keystroke.
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return { params, setParams };
}

/**
 * Debounces a value, for search boxes that would otherwise fire a request per
 * keystroke. The input stays immediate; only the query trails it.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
