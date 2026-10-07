'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { useListParams } from '@/lib/useListParams';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatusPill } from '@/components/admin/StatusPill';
import { ListPageHeader } from '@/components/admin/ListPageHeader';
import { ListToolbar } from '@/components/admin/ListToolbar';
import { RowActions, RowButton, TrashIcon } from '@/components/admin/RowActions';
import { Modal } from '@/components/admin/Modal';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toasts';
import type { ApiImage, PageMeta, Service } from '@/types';

const SORTS = [
  { value: 'order-asc', label: 'Display order' },
  { value: 'title-asc', label: 'Title, A-Z' },
  { value: 'newest', label: 'Newest' },
];

interface Draft {
  _id?: string;
  title: string;
  summary: string;
  body: string;
  icon: string;
  image?: ApiImage;
  highlights: string;
  ctaLabel: string;
  ctaHref: string;
  order: number;
  status: 'draft' | 'published';
}

const BLANK: Draft = {
  title: '',
  summary: '',
  body: '',
  icon: 'compass',
  highlights: '',
  ctaLabel: '',
  ctaHref: '',
  order: 0,
  status: 'draft',
};

function toDraft(s: Service): Draft {
  return {
    _id: s._id,
    title: s.title,
    summary: s.summary,
    body: s.body,
    icon: s.icon,
    image: s.image ?? undefined,
    highlights: s.highlights.join('\n'),
    ctaLabel: s.cta?.label ?? '',
    ctaHref: s.cta?.href ?? '',
    order: s.order,
    status: s.status,
  };
}

const input =
  'w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none';

/** The cards on the public /services page. */
function AdminServicesView() {
  const { params, setParams } = useListParams({ q: '', sort: 'order-asc', status: '' });
  const [services, setServices] = useState<Service[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: '100', sort: params.sort });
      if (params.q) query.set('q', params.q);
      if (params.status) query.set('status', params.status);
      const { items, meta: pageMeta } = await adminApi.list<Service>(`/api/admin/services?${query}`);
      setServices(items);
      setMeta(pageMeta);
      setError('');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load services.');
    } finally {
      setLoading(false);
    }
  }, [params.q, params.sort, params.status]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const body = {
      title: editing.title,
      summary: editing.summary,
      body: editing.body,
      icon: editing.icon,
      image: editing.image?.url ? editing.image : null,
      highlights: editing.highlights.split('\n').map((h) => h.trim()).filter(Boolean),
      cta: editing.ctaLabel && editing.ctaHref ? { label: editing.ctaLabel, href: editing.ctaHref } : null,
      order: Number(editing.order) || 0,
      status: editing.status,
    };
    try {
      if (editing._id) await adminApi.patch(`/api/admin/services/${editing._id}`, body);
      else await adminApi.post('/api/admin/services', body);
      toast({ message: editing._id ? 'Service saved.' : 'Service created.' });
      setEditing(null);
      await load();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not save the service.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(service: Service) {
    setBusyId(service._id);
    try {
      await adminApi.patch(`/api/admin/services/${service._id}/status`, {
        status: service.status === 'published' ? 'draft' : 'published',
      });
      await load();
    } catch (err) {
      toast({ tone: 'error', message: err instanceof AdminApiError ? err.message : 'Could not change status.' });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(service: Service) {
    const ok = await confirm({
      title: 'Delete this service?',
      body: (
        <>
          <strong className="text-ink">{service.title}</strong> will be removed from the services page.
        </>
      ),
      confirmLabel: 'Delete service',
    });
    if (!ok) return;
    setBusyId(service._id);
    try {
      await adminApi.remove(`/api/admin/services/${service._id}`);
      toast({ message: 'Service deleted.' });
      await load();
    } catch (err) {
      toast({ tone: 'error', message: err instanceof AdminApiError ? err.message : 'Could not delete.' });
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<Service>[] = [
    {
      key: 'title',
      header: 'Service',
      primary: true,
      render: (s) => (
        <button type="button" onClick={() => setEditing(toDraft(s))} className="text-left">
          <span className="block font-medium hover:underline">{s.title}</span>
          <span className="line-clamp-1 text-xs text-muted">{s.summary}</span>
        </button>
      ),
    },
    { key: 'order', header: 'Order', render: (s) => <span className="text-xs text-muted">{s.order}</span> },
    { key: 'status', header: 'Status', render: (s) => <StatusPill status={s.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (s) => (
        <RowActions>
          <RowButton onClick={() => toggle(s)} disabled={busyId === s._id}>
            {s.status === 'published' ? 'Unpublish' : 'Publish'}
          </RowButton>
          <RowButton onClick={() => setEditing(toDraft(s))}>Edit</RowButton>
          <RowButton onClick={() => remove(s)} disabled={busyId === s._id} destructive icon={<TrashIcon />}>
            <span className="sr-only">Delete</span>
          </RowButton>
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <ListPageHeader title="Services" description="The cards on the public What We Do page." />
      <div className="mb-5">
        <button
          type="button"
          onClick={() => setEditing({ ...BLANK })}
          className="h-11 rounded-full bg-gold-500 px-6 text-sm font-medium text-charcoal-950 transition-colors hover:bg-gold-400"
        >
          New service
        </button>
      </div>

      <ListToolbar
        search={params.q}
        onSearchChange={(q) => setParams({ q }, { replace: true })}
        searchPlaceholder="Search services"
        sort={params.sort}
        sorts={SORTS}
        onSortChange={(sort) => setParams({ sort })}
        busy={loading}
        resultLabel={meta ? `${meta.total} ${meta.total === 1 ? 'service' : 'services'}` : undefined}
      />

      {error ? (
        <p role="alert" className="mb-5 rounded-lg bg-maroon-600/10 px-4 py-3 text-sm text-maroon-700">
          {error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={services}
        rowKey={(s) => s._id}
        loading={loading}
        sort={params.sort}
        onSortChange={(sort) => setParams({ sort })}
        emptyTitle="No services yet"
        emptyMessage="Add the kinds of trip and help you offer."
      />

      {editing ? (
        <Modal
          as="form"
          onSubmit={save}
          label={editing._id ? 'Edit service' : 'New service'}
          onClose={() => setEditing(null)}
          className="max-w-2xl"
        >
          <>
            <h2 className="mb-5 text-xl">{editing._id ? 'Edit service' : 'New service'}</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="svc-title" className="mb-1.5 block text-sm font-medium">Title *</label>
                <input id="svc-title" required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={input} />
              </div>
              <div>
                <label htmlFor="svc-summary" className="mb-1.5 block text-sm font-medium">Summary *</label>
                <textarea id="svc-summary" required rows={2} maxLength={300} value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} className={input} />
              </div>
              <div>
                <label htmlFor="svc-body" className="mb-1.5 block text-sm font-medium">More detail</label>
                <textarea id="svc-body" rows={3} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} className={input} />
              </div>
              <div>
                <label htmlFor="svc-highlights" className="mb-1.5 block text-sm font-medium">Highlights (one per line)</label>
                <textarea id="svc-highlights" rows={3} value={editing.highlights} onChange={(e) => setEditing({ ...editing, highlights: e.target.value })} className={input} />
              </div>
              <ImageUploader label="Photograph" value={editing.image} onChange={(v) => setEditing({ ...editing, image: v ?? undefined })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="svc-cta" className="mb-1.5 block text-sm font-medium">Button label</label>
                  <input id="svc-cta" value={editing.ctaLabel} onChange={(e) => setEditing({ ...editing, ctaLabel: e.target.value })} className={input} />
                </div>
                <div>
                  <label htmlFor="svc-href" className="mb-1.5 block text-sm font-medium">Button link</label>
                  <input id="svc-href" placeholder="/tours?category=safaris" value={editing.ctaHref} onChange={(e) => setEditing({ ...editing, ctaHref: e.target.value })} className={input} />
                </div>
                <div>
                  <label htmlFor="svc-order" className="mb-1.5 block text-sm font-medium">Order</label>
                  <input id="svc-order" type="number" value={editing.order} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} className={input} />
                </div>
                <div>
                  <label htmlFor="svc-status" className="mb-1.5 block text-sm font-medium">Status</label>
                  <select id="svc-status" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as Draft['status'] })} className={`${input} bg-white`}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-7 flex gap-3">
              <button type="submit" disabled={saving} className="h-11 rounded-full bg-gold-500 px-8 text-sm font-medium text-charcoal-950 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="h-11 rounded-full border border-cream-300 px-6 text-sm">
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

export default function AdminServicesPage() {
  return (
    <Suspense>
      <AdminServicesView />
    </Suspense>
  );
}
