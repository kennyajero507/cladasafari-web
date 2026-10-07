'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { useListParams } from '@/lib/useListParams';
import { formatDate } from '@/lib/format';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatusPill } from '@/components/admin/StatusPill';
import { ListPageHeader } from '@/components/admin/ListPageHeader';
import { ListToolbar } from '@/components/admin/ListToolbar';
import { RowActions, RowButton, RowLink, TrashIcon } from '@/components/admin/RowActions';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toasts';
import type { CmsPage, PageMeta } from '@/types';

const SORTS = [
  { value: 'order-asc', label: 'Footer order' },
  { value: 'title-asc', label: 'Title, A-Z' },
  { value: 'updated', label: 'Recently edited' },
];

const TEMPLATE_LABELS: Record<CmsPage['template'], string> = {
  standard: 'Standard',
  legal: 'Legal / policy',
  contact: 'Contact',
};

/** About, Contact, policies and other standalone pages, each live at /<slug>. */
function AdminPagesView() {
  const { params, setParams } = useListParams({ q: '', sort: 'order-asc', status: '' });
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: '100', sort: params.sort });
      if (params.q) query.set('q', params.q);
      if (params.status) query.set('status', params.status);
      const { items, meta: pageMeta } = await adminApi.list<CmsPage>(`/api/admin/pages?${query}`);
      setPages(items);
      setMeta(pageMeta);
      setError('');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load pages.');
    } finally {
      setLoading(false);
    }
  }, [params.q, params.sort, params.status]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(page: CmsPage) {
    setBusyId(page._id);
    const next = page.status === 'published' ? 'draft' : 'published';
    try {
      await adminApi.patch(`/api/admin/pages/${page._id}/status`, { status: next });
      toast({
        message: next === 'published' ? `“${page.title}” is now live.` : `“${page.title}” is no longer on the site.`,
        action: {
          label: 'Undo',
          onAct: async () => {
            await adminApi.patch(`/api/admin/pages/${page._id}/status`, { status: page.status });
            await load();
          },
        },
      });
      await load();
    } catch (err) {
      toast({ tone: 'error', message: err instanceof AdminApiError ? err.message : 'Could not change status.' });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(page: CmsPage) {
    const ok = await confirm({
      title: 'Delete this page?',
      body: (
        <>
          <strong className="text-ink">{page.title}</strong> will be permanently removed and /{page.slug} will show
          “page not found”{['about', 'contact'].includes(page.slug) ? ' until the built-in version takes over' : ''}.
        </>
      ),
      confirmLabel: 'Delete page',
    });
    if (!ok) return;
    setBusyId(page._id);
    try {
      await adminApi.remove(`/api/admin/pages/${page._id}`);
      toast({ message: 'Page deleted.' });
      await load();
    } catch (err) {
      toast({ tone: 'error', message: err instanceof AdminApiError ? err.message : 'Could not delete.' });
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<CmsPage>[] = [
    {
      key: 'title',
      header: 'Page',
      render: (p) => (
        <Link href={`/admin/pages/${p._id}`} className="block">
          <span className="block font-medium hover:underline">
            {p.title}
            {p.isSample ? <span className="ml-2 rounded-full bg-cream-200 px-2 py-0.5 text-[0.62rem] uppercase tracking-wider text-muted">Sample</span> : null}
          </span>
          <span className="text-xs text-muted">/{p.slug}</span>
        </Link>
      ),
    },
    { key: 'template', header: 'Layout', hideOnMobile: true, render: (p) => <span className="text-xs text-muted">{TEMPLATE_LABELS[p.template]}</span> },
    {
      key: 'footer',
      header: 'Footer',
      hideOnMobile: true,
      render: (p) => <span className="text-xs text-muted">{p.showInFooter ? 'Listed' : '—'}</span>,
    },
    { key: 'updated', header: 'Edited', hideOnMobile: true, render: (p) => <span className="text-xs text-muted">{formatDate(p.updatedAt)}</span> },
    { key: 'status', header: 'Status', render: (p) => <StatusPill status={p.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p) => (
        <RowActions>
          <RowButton onClick={() => toggle(p)} disabled={busyId === p._id}>
            {p.status === 'published' ? 'Unpublish' : 'Publish'}
          </RowButton>
          <RowLink href={`/admin/pages/${p._id}`}>Edit</RowLink>
          <RowButton onClick={() => remove(p)} disabled={busyId === p._id} destructive icon={<TrashIcon />}>
            <span className="sr-only">Delete</span>
          </RowButton>
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <ListPageHeader
        title="Pages"
        description="About Us, Contact, policies and other standalone pages. Each is live at its own address once published."
        newHref="/admin/pages/new"
        newLabel="New page"
      />

      <ListToolbar
        search={params.q}
        onSearchChange={(q) => setParams({ q }, { replace: true })}
        searchPlaceholder="Search pages"
        sort={params.sort}
        sorts={SORTS}
        onSortChange={(sort) => setParams({ sort })}
        busy={loading}
        resultLabel={meta ? `${meta.total} ${meta.total === 1 ? 'page' : 'pages'}` : undefined}
      />

      {error ? (
        <p role="alert" className="mb-5 rounded-lg bg-maroon-600/10 px-4 py-3 text-sm text-maroon-700">
          {error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={pages}
        rowKey={(p) => p._id}
        loading={loading}
        emptyTitle="No pages yet"
        emptyMessage="Create About, Contact or policy pages here."
      />

      {confirmDialog}
    </div>
  );
}

export default function AdminPagesPage() {
  return (
    <Suspense>
      <AdminPagesView />
    </Suspense>
  );
}
