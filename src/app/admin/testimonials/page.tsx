'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { useListParams } from '@/lib/useListParams';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatusPill } from '@/components/admin/StatusPill';
import { ListPageHeader } from '@/components/admin/ListPageHeader';
import { ListToolbar } from '@/components/admin/ListToolbar';
import { Pagination } from '@/components/admin/Pagination';
import { BulkBar, BulkButton } from '@/components/admin/BulkBar';
import { RowActions, RowButton, TrashIcon } from '@/components/admin/RowActions';
import { Modal } from '@/components/admin/Modal';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toasts';
import type { Testimonial, PageMeta } from '@/types';

const BLANK = {
  authorName: '',
  authorLocation: '',
  quote: '',
  rating: 5,
  tourName: '',
  featured: false,
  order: 0,
  status: 'draft',
};

const PER_PAGE = 25;

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'author-asc', label: 'Reviewer, A-Z' },
  { value: 'rating-desc', label: 'Highest rated' },
];

function AdminTestimonialsView() {
  const { params, setParams } = useListParams({ page: '1', q: '', sort: 'newest', status: '' });
  const page = Number(params.page) || 1;

  const [items, setItems] = useState<Testimonial[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Partial<Testimonial> | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
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

      const { items: rows, meta: pageMeta } = await adminApi.list<Testimonial>(
        `/api/admin/testimonials?${query}`
      );
      setItems(rows);
      setMeta(pageMeta);
      setError('');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load testimonials.');
    } finally {
      setLoading(false);
    }
  }, [page, params.q, params.sort, params.status]);

  useEffect(() => {
    load();
  }, [load]);

  // Rows that left the view must not stay selected.
  useEffect(() => {
    setChecked((current) => {
      if (current.size === 0) return current;
      const visible = new Set(items.map((t) => t._id));
      const next = new Set([...current].filter((id) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [items]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    setSaving(true);
    setError('');
    const body = {
      authorName: editing.authorName,
      authorLocation: editing.authorLocation || undefined,
      quote: editing.quote,
      rating: Number(editing.rating ?? 5),
      tourName: editing.tourName || undefined,
      featured: Boolean(editing.featured),
      order: Number(editing.order ?? 0),
      status: editing.status,
    };

    try {
      const isNew = !editing._id;
      if (editing._id) await adminApi.patch(`/api/admin/testimonials/${editing._id}`, body);
      else await adminApi.post('/api/admin/testimonials', body);
      setEditing(null);
      toast({ message: isNew ? 'Testimonial created.' : 'Testimonial saved.' });
      await load();
    } catch (err) {
      const message =
        err instanceof AdminApiError ? err.message : 'Could not save the testimonial.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(t: Testimonial) {
    const ok = await confirm({
      title: 'Delete this testimonial?',
      body: (
        <>
          The review from <strong className="text-ink">{t.authorName}</strong> will be permanently
          removed. This cannot be undone.
        </>
      ),
      confirmLabel: 'Delete testimonial',
    });
    if (!ok) return;

    setBusyId(t._id);
    try {
      await adminApi.remove(`/api/admin/testimonials/${t._id}`);
      setError('');
      toast({ message: 'Testimonial deleted.' });
      await load();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not delete.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBusyId(null);
    }
  }

  async function applyStatus(
    t: Testimonial,
    next: 'draft' | 'published',
    { silent = false } = {}
  ) {
    setBusyId(t._id);
    const previous = t.status;
    try {
      const updated = await adminApi.patch<Testimonial>(
        `/api/admin/testimonials/${t._id}/status`,
        { status: next }
      );
      setItems((list) => list.map((x) => (x._id === t._id ? { ...x, ...updated } : x)));
      setError('');

      if (!silent) {
        toast({
          message:
            next === 'published'
              ? `${t.authorName}'s review is now live.`
              : `${t.authorName}'s review moved to draft.`,
          action: {
            label: 'Undo',
            onAct: () => applyStatus({ ...t, status: next }, previous, { silent: true }),
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

  async function bulkStatus(status: 'draft' | 'published') {
    const ids = [...checked];
    const previous = new Map(items.map((t) => [t._id, t.status]));
    setBulkBusy(true);
    try {
      await adminApi.bulkStatus('testimonials', ids, status);
      toast({
        message: `${ids.length} ${ids.length === 1 ? 'testimonial' : 'testimonials'} ${
          status === 'published' ? 'published' : 'moved to draft'
        }.`,
        action: {
          label: 'Undo',
          onAct: async () => {
            const toPublish = ids.filter((id) => previous.get(id) === 'published');
            const toDraft = ids.filter((id) => previous.get(id) === 'draft');
            try {
              if (toPublish.length)
                await adminApi.bulkStatus('testimonials', toPublish, 'published');
              if (toDraft.length) await adminApi.bulkStatus('testimonials', toDraft, 'draft');
              await load();
            } catch {
              toast({ tone: 'error', message: 'Could not undo that change.' });
            }
          },
        },
      });
      setChecked(new Set());
      await load();
    } catch (err) {
      const message =
        err instanceof AdminApiError ? err.message : 'Could not update those testimonials.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    const ids = [...checked];
    const ok = await confirm({
      title: `Delete ${ids.length} ${ids.length === 1 ? 'testimonial' : 'testimonials'}?`,
      body: 'They will be permanently removed. This cannot be undone.',
      confirmLabel: `Delete ${ids.length}`,
    });
    if (!ok) return;

    setBulkBusy(true);
    try {
      await adminApi.bulkRemove('testimonials', ids);
      toast({
        message: `${ids.length} ${ids.length === 1 ? 'testimonial' : 'testimonials'} deleted.`,
      });
      setChecked(new Set());
      await load();
    } catch (err) {
      const message =
        err instanceof AdminApiError ? err.message : 'Could not delete those testimonials.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBulkBusy(false);
    }
  }

  const columns: Column<Testimonial>[] = [
    {
      key: 'author',
      header: 'Reviewer',
      primary: true,
      sort: { asc: 'author-asc', desc: 'author-asc' },
      render: (t) => (
        <button type="button" onClick={() => setEditing(t)} className="text-left">
          <span className="block font-medium hover:underline">{t.authorName}</span>
          <span className="block text-xs text-muted">{t.authorLocation}</span>
        </button>
      ),
    },
    {
      key: 'quote',
      header: 'Quote',
      render: (t) => <span className="line-clamp-2 block max-w-md text-xs text-muted">{t.quote}</span>,
    },
    {
      key: 'rating',
      header: 'Rating',
      sort: { asc: 'rating-desc', desc: 'rating-desc' },
      render: (t) => <span className="text-xs">{t.rating} ★</span>,
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
            title={t.status === 'published' ? 'Remove from the homepage' : 'Show on the homepage'}
          >
            {t.status === 'published' ? 'Unpublish' : 'Publish'}
          </RowButton>
          <RowButton onClick={() => setEditing(t)} title="Edit this testimonial">
            Edit
          </RowButton>
          <RowButton
            onClick={() => remove(t)}
            disabled={busyId === t._id}
            destructive
            title="Delete this testimonial"
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
      ? `${meta.total} ${meta.total === 1 ? 'result' : 'results'} for "${params.q}"`
      : `${meta.total} ${meta.total === 1 ? 'testimonial' : 'testimonials'}`
    : undefined;

  return (
    <div>
      <ListPageHeader
        title="Testimonials"
        description="Shown in the carousel on the homepage. Publish only genuine, attributable reviews."
      />

      <div className="mb-5">
        <button
          type="button"
          onClick={() => setEditing({ ...BLANK } as Partial<Testimonial>)}
          className="h-11 rounded-full bg-gold-500 px-6 text-sm font-medium text-charcoal-950 transition-colors hover:bg-gold-400"
        >
          New testimonial
        </button>
      </div>

      <ListToolbar
        search={params.q}
        onSearchChange={(q) => setParams({ q }, { replace: true })}
        searchPlaceholder="Search by reviewer or quote"
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
        rowKey={(t) => t._id}
        loading={loading}
        sort={params.sort}
        onSortChange={(sort) => setParams({ sort })}
        selected={checked}
        onSelectedChange={setChecked}
        bulkBar={
          <BulkBar count={checked.size} onClear={() => setChecked(new Set())} busy={bulkBusy}>
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
        emptyTitle={params.q ? 'No matching testimonials' : 'No testimonials yet'}
        emptyMessage={
          params.q
            ? `Nothing matched "${params.q}". Try a shorter search, or clear it to see them all.`
            : 'Add reviews from travellers who have been on your trips.'
        }
      />

      <Pagination
        meta={meta}
        onPageChange={(next) => setParams({ page: String(next) })}
        busy={loading}
      />

      {editing ? (
        <Modal
          as="form"
          onSubmit={save}
          label={editing._id ? 'Edit testimonial' : 'New testimonial'}
          onClose={() => setEditing(null)}
          className="max-w-lg"
        >
          <>
            <h2 className="mb-5 text-xl">{editing._id ? 'Edit testimonial' : 'New testimonial'}</h2>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="t-name" className="mb-1.5 block text-sm font-medium">
                    Reviewer name *
                  </label>
                  <input
                    id="t-name"
                    required
                    value={editing.authorName ?? ''}
                    onChange={(e) => setEditing({ ...editing, authorName: e.target.value })}
                    className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="t-loc" className="mb-1.5 block text-sm font-medium">
                    Location
                  </label>
                  <input
                    id="t-loc"
                    value={editing.authorLocation ?? ''}
                    onChange={(e) => setEditing({ ...editing, authorLocation: e.target.value })}
                    className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="t-quote" className="mb-1.5 block text-sm font-medium">
                  Quote * <span className="text-xs text-muted">(max 600 characters)</span>
                </label>
                <textarea
                  id="t-quote"
                  required
                  rows={5}
                  maxLength={600}
                  value={editing.quote ?? ''}
                  onChange={(e) => setEditing({ ...editing, quote: e.target.value })}
                  className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="t-rating" className="mb-1.5 block text-sm font-medium">
                    Rating
                  </label>
                  <select
                    id="t-rating"
                    value={editing.rating ?? 5}
                    onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })}
                    className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} ★
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="t-order" className="mb-1.5 block text-sm font-medium">
                    Order
                  </label>
                  <input
                    id="t-order"
                    type="number"
                    value={editing.order ?? 0}
                    onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })}
                    className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="t-status" className="mb-1.5 block text-sm font-medium">
                    Status
                  </label>
                  <select
                    id="t-status"
                    value={editing.status ?? 'draft'}
                    onChange={(e) =>
                      setEditing({ ...editing, status: e.target.value as Testimonial['status'] })
                    }
                    className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="t-tour" className="mb-1.5 block text-sm font-medium">
                  Tour name
                </label>
                <input
                  id="t-tour"
                  value={editing.tourName ?? ''}
                  onChange={(e) => setEditing({ ...editing, tourName: e.target.value })}
                  className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(editing.featured)}
                  onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                  className="h-4 w-4 accent-gold-500"
                />
                Featured
              </label>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-full bg-gold-500 px-8 text-sm font-medium text-charcoal-950 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="h-11 rounded-full border border-cream-300 px-6 text-sm"
              >
                Cancel
              </button>
            </div>
          </>
        </Modal>
      ) : null}

      {confirmDialog}
    </div>
  );
}

/** useSearchParams needs a Suspense boundary during prerender. */
export default function AdminTestimonialsPage() {
  return (
    <Suspense>
      <AdminTestimonialsView />
    </Suspense>
  );
}
