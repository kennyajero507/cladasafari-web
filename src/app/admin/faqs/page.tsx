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
import type { Faq, PageMeta } from '@/types';

const GROUPS = ['general', 'booking', 'travel', 'payment'] as const;

const BLANK = { question: '', answer: '', group: 'general', order: 0, status: 'draft' };

const PER_PAGE = 25;

const SORTS = [
  { value: 'order-asc', label: 'Group and order' },
  { value: 'question-asc', label: 'Question, A-Z' },
  { value: 'newest', label: 'Newest' },
];

function AdminFaqsView() {
  const { params, setParams } = useListParams({
    page: '1',
    q: '',
    sort: 'order-asc',
    status: '',
    group: '',
  });
  const page = Number(params.page) || 1;

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Partial<Faq> | null>(null);
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
      if (params.group) query.set('group', params.group);

      const { items, meta: pageMeta } = await adminApi.list<Faq>(`/api/admin/faqs?${query}`);
      setFaqs(items);
      setMeta(pageMeta);
      setError('');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load FAQs.');
    } finally {
      setLoading(false);
    }
  }, [page, params.q, params.sort, params.status, params.group]);

  useEffect(() => {
    load();
  }, [load]);

  // Rows that left the view must not stay selected.
  useEffect(() => {
    setChecked((current) => {
      if (current.size === 0) return current;
      const visible = new Set(faqs.map((f) => f._id));
      const next = new Set([...current].filter((id) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [faqs]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    setSaving(true);
    setError('');
    const body = {
      question: editing.question,
      answer: editing.answer,
      group: editing.group,
      order: Number(editing.order ?? 0),
      status: editing.status,
    };

    try {
      const isNew = !editing._id;
      if (editing._id) await adminApi.patch(`/api/admin/faqs/${editing._id}`, body);
      else await adminApi.post('/api/admin/faqs', body);
      setEditing(null);
      toast({ message: isNew ? 'FAQ created.' : 'FAQ saved.' });
      await load();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not save the FAQ.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(faq: Faq) {
    const ok = await confirm({
      title: 'Delete this FAQ?',
      body: (
        <>
          <strong className="text-ink">{faq.question}</strong> will be permanently removed. This
          cannot be undone.
        </>
      ),
      confirmLabel: 'Delete FAQ',
    });
    if (!ok) return;

    setBusyId(faq._id);
    try {
      await adminApi.remove(`/api/admin/faqs/${faq._id}`);
      setError('');
      toast({ message: 'FAQ deleted.' });
      await load();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not delete the FAQ.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBusyId(null);
    }
  }

  async function applyStatus(faq: Faq, next: 'draft' | 'published', { silent = false } = {}) {
    setBusyId(faq._id);
    const previous = faq.status;
    try {
      const updated = await adminApi.patch<Faq>(`/api/admin/faqs/${faq._id}/status`, {
        status: next,
      });
      setFaqs((list) => list.map((f) => (f._id === faq._id ? { ...f, ...updated } : f)));
      setError('');

      if (!silent) {
        toast({
          message: next === 'published' ? 'FAQ is now live.' : 'FAQ moved to draft.',
          action: {
            label: 'Undo',
            onAct: () => applyStatus({ ...faq, status: next }, previous, { silent: true }),
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
    const previous = new Map(faqs.map((f) => [f._id, f.status]));
    setBulkBusy(true);
    try {
      await adminApi.bulkStatus('faqs', ids, status);
      toast({
        message: `${ids.length} ${ids.length === 1 ? 'FAQ' : 'FAQs'} ${
          status === 'published' ? 'published' : 'moved to draft'
        }.`,
        action: {
          label: 'Undo',
          onAct: async () => {
            const toPublish = ids.filter((id) => previous.get(id) === 'published');
            const toDraft = ids.filter((id) => previous.get(id) === 'draft');
            try {
              if (toPublish.length) await adminApi.bulkStatus('faqs', toPublish, 'published');
              if (toDraft.length) await adminApi.bulkStatus('faqs', toDraft, 'draft');
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
      const message = err instanceof AdminApiError ? err.message : 'Could not update those FAQs.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    const ids = [...checked];
    const ok = await confirm({
      title: `Delete ${ids.length} ${ids.length === 1 ? 'FAQ' : 'FAQs'}?`,
      body: 'They will be permanently removed. This cannot be undone.',
      confirmLabel: `Delete ${ids.length}`,
    });
    if (!ok) return;

    setBulkBusy(true);
    try {
      await adminApi.bulkRemove('faqs', ids);
      toast({ message: `${ids.length} ${ids.length === 1 ? 'FAQ' : 'FAQs'} deleted.` });
      setChecked(new Set());
      await load();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not delete those FAQs.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBulkBusy(false);
    }
  }

  const columns: Column<Faq>[] = [
    {
      key: 'question',
      header: 'Question',
      primary: true,
      sort: { asc: 'question-asc', desc: 'question-asc' },
      render: (f) => (
        <button type="button" onClick={() => setEditing(f)} className="text-left font-medium hover:underline">
          {f.question}
        </button>
      ),
    },
    { key: 'group', header: 'Group', render: (f) => <span className="text-xs capitalize text-muted">{f.group}</span> },
    { key: 'order', header: 'Order', render: (f) => <span className="text-xs text-muted">{f.order}</span> },
    { key: 'status', header: 'Status', render: (f) => <StatusPill status={f.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (f) => (
        <RowActions>
          <RowButton
            onClick={() => applyStatus(f, f.status === 'published' ? 'draft' : 'published')}
            disabled={busyId === f._id}
            title={f.status === 'published' ? 'Move back to draft' : 'Show on the public site'}
          >
            {f.status === 'published' ? 'Unpublish' : 'Publish'}
          </RowButton>
          <RowButton onClick={() => setEditing(f)} title="Edit this FAQ">
            Edit
          </RowButton>
          <RowButton
            onClick={() => remove(f)}
            disabled={busyId === f._id}
            destructive
            title="Delete this FAQ"
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
      : `${meta.total} ${meta.total === 1 ? 'FAQ' : 'FAQs'}`
    : undefined;

  return (
    <div>
      <ListPageHeader title="FAQs" description="Shown in the accordion on the homepage." />

      <div className="mb-5">
        <button
          type="button"
          onClick={() => setEditing({ ...BLANK } as Partial<Faq>)}
          className="h-11 rounded-full bg-gold-500 px-6 text-sm font-medium text-charcoal-950 transition-colors hover:bg-gold-400"
        >
          New FAQ
        </button>
      </div>

      <ListToolbar
        search={params.q}
        onSearchChange={(q) => setParams({ q }, { replace: true })}
        searchPlaceholder="Search questions and answers"
        sort={params.sort}
        sorts={SORTS}
        onSortChange={(sort) => setParams({ sort })}
        busy={loading}
        resultLabel={resultLabel}
        filters={[{ value: '', label: 'All groups' }, ...GROUPS.map((g) => ({ value: g, label: g }))].map(
          (f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setParams({ group: f.value })}
              aria-pressed={params.group === f.value}
              className={`h-9 rounded-full px-4 text-xs capitalize transition-colors ${
                params.group === f.value
                  ? 'bg-gold-500 text-charcoal-950'
                  : 'border border-cream-300 text-muted hover:border-gold-500'
              }`}
            >
              {f.label}
            </button>
          )
        )}
      />

      {error ? (
        <p role="alert" className="mb-5 rounded-lg bg-maroon-600/10 px-4 py-3 text-sm text-maroon-700">
          {error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={faqs}
        rowKey={(f) => f._id}
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
        emptyTitle={params.q ? 'No matching FAQs' : 'No FAQs yet'}
        emptyMessage={
          params.q
            ? `Nothing matched "${params.q}". Try a shorter search, or clear it to see them all.`
            : 'Add the questions travellers ask most often.'
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
          ) : null
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
          label={editing._id ? 'Edit FAQ' : 'New FAQ'}
          onClose={() => setEditing(null)}
          className="max-w-lg"
        >
          <>
            <h2 className="mb-5 text-xl">{editing._id ? 'Edit FAQ' : 'New FAQ'}</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="faq-q" className="mb-1.5 block text-sm font-medium">
                  Question *
                </label>
                <input
                  id="faq-q"
                  required
                  value={editing.question ?? ''}
                  onChange={(e) => setEditing({ ...editing, question: e.target.value })}
                  className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="faq-a" className="mb-1.5 block text-sm font-medium">
                  Answer *
                </label>
                <textarea
                  id="faq-a"
                  required
                  rows={6}
                  value={editing.answer ?? ''}
                  onChange={(e) => setEditing({ ...editing, answer: e.target.value })}
                  className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="faq-group" className="mb-1.5 block text-sm font-medium">
                    Group
                  </label>
                  <select
                    id="faq-group"
                    value={editing.group ?? 'general'}
                    onChange={(e) => setEditing({ ...editing, group: e.target.value as Faq['group'] })}
                    className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                  >
                    {GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="faq-order" className="mb-1.5 block text-sm font-medium">
                    Order
                  </label>
                  <input
                    id="faq-order"
                    type="number"
                    value={editing.order ?? 0}
                    onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })}
                    className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="faq-status" className="mb-1.5 block text-sm font-medium">
                    Status
                  </label>
                  <select
                    id="faq-status"
                    value={editing.status ?? 'draft'}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value as Faq['status'] })}
                    className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
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
export default function AdminFaqsPage() {
  return (
    <Suspense>
      <AdminFaqsView />
    </Suspense>
  );
}
