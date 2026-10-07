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
import type { Destination, PageMeta } from '@/types';

const PER_PAGE = 25;

const SORTS = [
  { value: 'order-asc', label: 'Display order' },
  { value: 'name-asc', label: 'Name, A-Z' },
  { value: 'newest', label: 'Newest' },
];

function AdminDestinationsView() {
  const { params, setParams } = useListParams({ page: '1', q: '', sort: 'order-asc', status: '' });
  const page = Number(params.page) || 1;

  const [items, setItems] = useState<Destination[]>([]);
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

      const { items: rows, meta: pageMeta } = await adminApi.list<Destination>(
        `/api/admin/destinations?${query}`
      );
      setItems(rows);
      setMeta(pageMeta);
      setError('');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load destinations.');
    } finally {
      setLoading(false);
    }
  }, [page, params.q, params.sort, params.status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSelected((current) => {
      if (current.size === 0) return current;
      const visible = new Set(items.map((d) => d._id));
      const next = new Set([...current].filter((id) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [items]);

  async function applyStatus(d: Destination, next: 'draft' | 'published', { silent = false } = {}) {
    setBusyId(d._id);
    const previous = d.status;
    try {
      const updated = await adminApi.patch<Destination>(
        `/api/admin/destinations/${d._id}/status`,
        { status: next }
      );
      setItems((list) => list.map((x) => (x._id === d._id ? { ...x, ...updated } : x)));
      setError('');

      if (!silent) {
        toast({
          message:
            next === 'published' ? `${d.name} is now live.` : `${d.name} is no longer public.`,
          action: {
            label: 'Undo',
            onAct: () => applyStatus({ ...d, status: next }, previous, { silent: true }),
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

  async function remove(d: Destination) {
    const ok = await confirm({
      title: 'Delete this destination?',
      body: (
        <>
          <strong className="text-ink">{d.name}</strong> will be permanently removed, along with its
          parks. Tours linked to it will keep working. This cannot be undone.
        </>
      ),
      confirmLabel: 'Delete destination',
    });
    if (!ok) return;

    setBusyId(d._id);
    try {
      await adminApi.remove(`/api/admin/destinations/${d._id}`);
      setError('');
      toast({ message: `${d.name} was deleted.` });
      await load();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not delete.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBusyId(null);
    }
  }

  async function bulkStatus(status: 'draft' | 'published') {
    const ids = [...selected];
    const previous = new Map(items.map((d) => [d._id, d.status]));
    setBulkBusy(true);
    try {
      await adminApi.bulkStatus('destinations', ids, status);
      toast({
        message: `${ids.length} ${ids.length === 1 ? 'destination' : 'destinations'} ${
          status === 'published' ? 'published' : 'unpublished'
        }.`,
        action: {
          label: 'Undo',
          onAct: async () => {
            const toPublish = ids.filter((id) => previous.get(id) === 'published');
            const toDraft = ids.filter((id) => previous.get(id) === 'draft');
            try {
              if (toPublish.length)
                await adminApi.bulkStatus('destinations', toPublish, 'published');
              if (toDraft.length) await adminApi.bulkStatus('destinations', toDraft, 'draft');
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
      const message =
        err instanceof AdminApiError ? err.message : 'Could not update those destinations.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    const ids = [...selected];
    const ok = await confirm({
      title: `Delete ${ids.length} ${ids.length === 1 ? 'destination' : 'destinations'}?`,
      body: 'They will be permanently removed, along with their parks. Tours linked to them will keep working. This cannot be undone.',
      confirmLabel: `Delete ${ids.length}`,
    });
    if (!ok) return;

    setBulkBusy(true);
    try {
      await adminApi.bulkRemove('destinations', ids);
      toast({
        message: `${ids.length} ${ids.length === 1 ? 'destination' : 'destinations'} deleted.`,
      });
      setSelected(new Set());
      await load();
    } catch (err) {
      const message =
        err instanceof AdminApiError ? err.message : 'Could not delete those destinations.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBulkBusy(false);
    }
  }

  const columns: Column<Destination>[] = [
    {
      key: 'name',
      header: 'Destination',
      primary: true,
      sort: { asc: 'name-asc', desc: 'name-desc' },
      render: (d) => (
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded bg-cream-100">
            {d.cardImage?.url ? (
              <Image src={d.cardImage.url} alt="" fill sizes="64px" className="object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <Link
              href={`/admin/destinations/${d._id}`}
              className="block truncate font-medium hover:underline"
            >
              {d.name}
            </Link>
            <p className="truncate text-xs text-muted">{d.tagline}</p>
          </div>
        </div>
      ),
    },
    { key: 'country', header: 'Country', render: (d) => <span className="text-xs">{d.country}</span> },
    {
      key: 'parks',
      header: 'Parks',
      render: (d) => <span className="text-xs text-muted">{d.parks?.length ?? 0}</span>,
    },
    { key: 'status', header: 'Status', render: (d) => <StatusPill status={d.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (d) => (
        <RowActions>
          <RowButton
            onClick={() => applyStatus(d, d.status === 'published' ? 'draft' : 'published')}
            disabled={busyId === d._id}
            title={d.status === 'published' ? 'Remove from the public site' : 'Make live'}
          >
            {d.status === 'published' ? 'Unpublish' : 'Publish'}
          </RowButton>
          <RowLink href={`/admin/destinations/${d._id}`} title="Edit this destination">
            Edit
          </RowLink>
          <RowButton
            onClick={() => remove(d)}
            disabled={busyId === d._id}
            destructive
            title="Delete this destination"
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
      : `${meta.total} ${meta.total === 1 ? 'destination' : 'destinations'}`
    : undefined;

  return (
    <div>
      <ListPageHeader
        title="Destinations"
        description="Countries and the parks within them, shown on the destinations pages."
        newHref="/admin/destinations/new"
        newLabel="New destination"
      />

      <ListToolbar
        search={params.q}
        onSearchChange={(q) => setParams({ q }, { replace: true })}
        searchPlaceholder="Search by name or tagline"
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
        rows={items}
        rowKey={(d) => d._id}
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
        emptyTitle={params.q ? 'No matching destinations' : 'No destinations yet'}
        emptyMessage={
          params.q
            ? `Nothing matched “${params.q}”. Try a shorter search, or clear it to see them all.`
            : 'Add the countries you operate in, each with its parks and best-time guidance.'
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
              href="/admin/destinations/new"
              className="inline-block rounded-full bg-gold-500 px-6 py-2.5 text-sm text-charcoal-950"
            >
              New destination
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
export default function AdminDestinationsPage() {
  return (
    <Suspense>
      <AdminDestinationsView />
    </Suspense>
  );
}
