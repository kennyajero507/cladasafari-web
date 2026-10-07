'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { useListParams } from '@/lib/useListParams';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatusPill } from '@/components/admin/StatusPill';
import { ListPageHeader } from '@/components/admin/ListPageHeader';
import { ListToolbar } from '@/components/admin/ListToolbar';
import { Pagination } from '@/components/admin/Pagination';
import { BulkBar, BulkButton } from '@/components/admin/BulkBar';
import { RowActions, RowButton, RowLink, TrashIcon } from '@/components/admin/RowActions';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toasts';
import { formatPrice } from '@/lib/format';
import type { Tour, PageMeta } from '@/types';

const PER_PAGE = 25;

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'duration-asc', label: 'Shortest first' },
];

function AdminToursView() {
  const { params, setParams } = useListParams({ page: '1', q: '', sort: 'newest', status: '' });
  const page = Number(params.page) || 1;

  const [tours, setTours] = useState<Tour[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [confirm, confirmDialog] = useConfirm();
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        limit: String(PER_PAGE),
        page: String(page),
        sort: params.sort,
      });
      if (params.q) query.set('q', params.q);
      if (params.status) query.set('status', params.status);

      const { items, meta: pageMeta } = await adminApi.list<Tour>(`/api/admin/tours?${query}`);
      setTours(items);
      setMeta(pageMeta);
      setError('');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load tours.');
    } finally {
      setLoading(false);
    }
  }, [page, params.q, params.sort, params.status]);

  useEffect(() => {
    load();
  }, [load]);

  // Rows that just left the view cannot stay selected: the bulk bar would
  // claim a count covering things the admin can no longer see.
  useEffect(() => {
    setSelected((current) => {
      if (current.size === 0) return current;
      const visible = new Set(tours.map((t) => t._id));
      const next = new Set([...current].filter((id) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [tours]);

  /** Applies a status, returning the previous one so the toast can offer Undo. */
  async function applyStatus(tour: Tour, next: 'draft' | 'published', { silent = false } = {}) {
    setBusyId(tour._id);
    const previous = tour.status;
    try {
      const updated = await adminApi.patch<Tour>(`/api/admin/tours/${tour._id}/status`, {
        status: next,
      });
      setTours((list) => list.map((t) => (t._id === tour._id ? { ...t, ...updated } : t)));
      setError('');

      if (!silent) {
        toast({
          message:
            next === 'published'
              ? `“${tour.title}” is now live.`
              : `“${tour.title}” is no longer on the public site.`,
          action: {
            label: 'Undo',
            onAct: () => applyStatus({ ...tour, status: next }, previous, { silent: true }),
          },
        });
      }
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not change status.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(tour: Tour) {
    const ok = await confirm({
      title: 'Delete this tour?',
      body: (
        <>
          <strong className="text-ink">{tour.title}</strong> will be permanently removed, along with
          its itinerary and gallery. This cannot be undone.
        </>
      ),
      confirmLabel: 'Delete tour',
    });
    if (!ok) return;

    setBusyId(tour._id);
    try {
      await adminApi.remove(`/api/admin/tours/${tour._id}`);
      setError('');
      toast({ message: `“${tour.title}” was deleted.` });
      await load();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not delete the tour.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBusyId(null);
    }
  }

  async function bulkStatus(status: 'draft' | 'published') {
    const ids = [...selected];
    setBulkBusy(true);
    try {
      await adminApi.bulkStatus('tours', ids, status);
      toast({
        message: `${ids.length} ${ids.length === 1 ? 'tour' : 'tours'} ${
          status === 'published' ? 'published' : 'unpublished'
        }.`,
        action: {
          label: 'Undo',
          onAct: async () => {
            // The previous statuses were mixed, so Undo restores each row to
            // what it was before this action rather than to one blanket value.
            const previous = new Map(tours.map((t) => [t._id, t.status]));
            const toPublish = ids.filter((id) => previous.get(id) === 'published');
            const toDraft = ids.filter((id) => previous.get(id) === 'draft');
            try {
              if (toPublish.length) await adminApi.bulkStatus('tours', toPublish, 'published');
              if (toDraft.length) await adminApi.bulkStatus('tours', toDraft, 'draft');
              await load();
            } catch {
              toast({ tone: 'error', message: 'Could not undo that change.' });
            }
          },
        },
      });
      setSelected(new Set());
      await load();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not update those tours.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    const ids = [...selected];
    const ok = await confirm({
      title: `Delete ${ids.length} ${ids.length === 1 ? 'tour' : 'tours'}?`,
      body: 'They will be permanently removed, along with their itineraries and galleries. This cannot be undone.',
      confirmLabel: `Delete ${ids.length}`,
    });
    if (!ok) return;

    setBulkBusy(true);
    try {
      await adminApi.bulkRemove('tours', ids);
      toast({ message: `${ids.length} ${ids.length === 1 ? 'tour' : 'tours'} deleted.` });
      setSelected(new Set());
      await load();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not delete those tours.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBulkBusy(false);
    }
  }

  const columns: Column<Tour>[] = [
    {
      key: 'title',
      header: 'Package',
      primary: true,
      sort: { asc: 'title-asc', desc: 'title-desc' },
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded bg-cream-100">
            {t.heroImage?.url ? (
              <Image src={t.heroImage.url} alt="" fill sizes="64px" className="object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <Link href={`/admin/tours/${t._id}`} className="block truncate font-medium hover:underline">
              {t.title}
            </Link>
            <p className="truncate text-xs text-muted">{t.locationLabel || t.countries?.join(', ')}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (t) => (
        <span className="text-xs text-muted">
          {t.categoryInfo?.group ? `${t.categoryInfo.group.name} › ` : ''}
          {t.categoryInfo?.name ?? t.category}
          {t.isSample ? (
            <span className="ml-1.5 rounded bg-cream-200 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide">
              Sample
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      sort: { asc: 'duration-asc', desc: 'duration-asc' },
      render: (t) => <span className="text-xs">{t.durationDays}d</span>,
    },
    {
      key: 'price',
      header: 'From',
      sort: { asc: 'price-asc', desc: 'price-desc' },
      render: (t) => <span className="text-xs">{formatPrice(t.priceFrom, t.currency)}</span>,
    },
    { key: 'status', header: 'Status', render: (t) => <StatusPill status={t.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (t) => (
        <RowActions>
          <RowButton
            onClick={() => applyStatus(t, t.status === 'published' ? 'draft' : 'published')}
            disabled={busyId === t._id}
            title={t.status === 'published' ? 'Remove from the public site' : 'Make live'}
          >
            {t.status === 'published' ? 'Unpublish' : 'Publish'}
          </RowButton>
          <RowLink href={`/admin/tours/${t._id}`} title="Edit this tour">
            Edit
          </RowLink>
          <RowButton
            onClick={() => remove(t)}
            disabled={busyId === t._id}
            destructive
            title="Delete this tour"
            icon={<TrashIcon />}
          >
            <span className="sr-only">Delete</span>
          </RowButton>
        </RowActions>
      ),
    },
  ];

  const resultLabel = meta
    ? params.q
      ? `${meta.total} ${meta.total === 1 ? 'result' : 'results'} for “${params.q}”`
      : `${meta.total} ${meta.total === 1 ? 'tour' : 'tours'}`
    : undefined;

  return (
    <div>
      <ListPageHeader
        title="Tours"
        description="Expeditions and weekend escapes shown on the public site."
        newHref="/admin/tours/new"
        newLabel="New tour"
      />

      <ListToolbar
        search={params.q}
        onSearchChange={(q) => setParams({ q }, { replace: true })}
        searchPlaceholder="Search tours by title or summary"
        sort={params.sort}
        sorts={SORTS}
        onSortChange={(sort) => setParams({ sort })}
        busy={loading}
        resultLabel={resultLabel}
        filters={[
          { value: '', label: 'All' },
          { value: 'published', label: 'Published' },
          { value: 'draft', label: 'Drafts' },
        ].map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setParams({ status: f.value })}
            aria-pressed={params.status === f.value}
            className={`h-9 rounded-full px-4 text-xs transition-colors ${
              params.status === f.value
                ? 'bg-gold-500 text-charcoal-950'
                : 'border border-cream-300 text-muted hover:border-gold-500'
            }`}
          >
            {f.label}
          </button>
        ))}
      />

      {error ? (
        <p role="alert" className="mb-5 rounded-lg bg-maroon-600/10 px-4 py-3 text-sm text-maroon-700">
          {error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={tours}
        rowKey={(t) => t._id}
        loading={loading}
        sort={params.sort}
        onSortChange={(sort) => setParams({ sort })}
        selected={selected}
        onSelectedChange={setSelected}
        bulkBar={
          <BulkBar count={selected.size} onClear={() => setSelected(new Set())} busy={bulkBusy}>
            <BulkButton onClick={() => bulkStatus('published')} disabled={bulkBusy}>
              Publish
            </BulkButton>
            <BulkButton onClick={() => bulkStatus('draft')} disabled={bulkBusy}>
              Unpublish
            </BulkButton>
            <BulkButton onClick={bulkDelete} disabled={bulkBusy} destructive>
              Delete
            </BulkButton>
          </BulkBar>
        }
        emptyTitle={params.q ? 'No matching tours' : 'No tours yet'}
        emptyMessage={
          params.q
            ? `Nothing matched “${params.q}”. Try a shorter search, or clear it to see every tour.`
            : 'Create your first expedition and it will appear on the public site once published.'
        }
        emptyAction={
          params.q ? (
            <button
              type="button"
              onClick={() => setParams({ q: '' })}
              className="inline-block rounded-full border border-cream-300 px-6 py-2.5 text-sm transition-colors hover:border-gold-500"
            >
              Clear search
            </button>
          ) : (
            <Link
              href="/admin/tours/new"
              className="inline-block rounded-full bg-gold-500 px-6 py-2.5 text-sm text-charcoal-950"
            >
              New tour
            </Link>
          )
        }
      />

      <Pagination
        meta={meta}
        onPageChange={(next) => setParams({ page: String(next) })}
        busy={loading}
      />

      {confirmDialog}
    </div>
  );
}

/** useSearchParams needs a Suspense boundary during prerender. */
export default function AdminToursPage() {
  return (
    <Suspense>
      <AdminToursView />
    </Suspense>
  );
}
