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
import { formatDate } from '@/lib/format';
import type { BlogPost, PageMeta } from '@/types';

const PER_PAGE = 25;

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title-asc', label: 'Title, A-Z' },
];

function AdminBlogView() {
  const { params, setParams } = useListParams({ page: '1', q: '', sort: 'newest', status: '' });
  const page = Number(params.page) || 1;

  const [posts, setPosts] = useState<BlogPost[]>([]);
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

      const { items, meta: pageMeta } = await adminApi.list<BlogPost>(`/api/admin/blog?${query}`);
      setPosts(items);
      setMeta(pageMeta);
      setError('');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load posts.');
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
      const visible = new Set(posts.map((p) => p._id));
      const next = new Set([...current].filter((id) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [posts]);

  async function applyStatus(post: BlogPost, next: 'draft' | 'published', { silent = false } = {}) {
    setBusyId(post._id);
    const previous = post.status;
    try {
      const updated = await adminApi.patch<BlogPost>(`/api/admin/blog/${post._id}/status`, {
        status: next,
      });
      setPosts((list) => list.map((p) => (p._id === post._id ? { ...p, ...updated } : p)));
      setError('');

      if (!silent) {
        toast({
          message:
            next === 'published'
              ? `“${post.title}” is now published.`
              : `“${post.title}” is back to draft.`,
          action: {
            label: 'Undo',
            onAct: () => applyStatus({ ...post, status: next }, previous, { silent: true }),
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

  async function remove(post: BlogPost) {
    const ok = await confirm({
      title: 'Delete this post?',
      body: (
        <>
          <strong className="text-ink">{post.title}</strong> will be permanently removed. This cannot
          be undone.
        </>
      ),
      confirmLabel: 'Delete post',
    });
    if (!ok) return;

    setBusyId(post._id);
    try {
      await adminApi.remove(`/api/admin/blog/${post._id}`);
      setError('');
      toast({ message: `“${post.title}” was deleted.` });
      await load();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not delete the post.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBusyId(null);
    }
  }

  async function bulkStatus(status: 'draft' | 'published') {
    const ids = [...selected];
    const previous = new Map(posts.map((p) => [p._id, p.status]));
    setBulkBusy(true);
    try {
      await adminApi.bulkStatus('blog', ids, status);
      toast({
        message: `${ids.length} ${ids.length === 1 ? 'post' : 'posts'} ${
          status === 'published' ? 'published' : 'moved to draft'
        }.`,
        action: {
          label: 'Undo',
          onAct: async () => {
            const toPublish = ids.filter((id) => previous.get(id) === 'published');
            const toDraft = ids.filter((id) => previous.get(id) === 'draft');
            try {
              if (toPublish.length) await adminApi.bulkStatus('blog', toPublish, 'published');
              if (toDraft.length) await adminApi.bulkStatus('blog', toDraft, 'draft');
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
      const message = err instanceof AdminApiError ? err.message : 'Could not update those posts.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    const ids = [...selected];
    const ok = await confirm({
      title: `Delete ${ids.length} ${ids.length === 1 ? 'post' : 'posts'}?`,
      body: 'They will be permanently removed. This cannot be undone.',
      confirmLabel: `Delete ${ids.length}`,
    });
    if (!ok) return;

    setBulkBusy(true);
    try {
      await adminApi.bulkRemove('blog', ids);
      toast({ message: `${ids.length} ${ids.length === 1 ? 'post' : 'posts'} deleted.` });
      setSelected(new Set());
      await load();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not delete those posts.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBulkBusy(false);
    }
  }

  const columns: Column<BlogPost>[] = [
    {
      key: 'title',
      header: 'Post',
      primary: true,
      sort: { asc: 'title-asc', desc: 'title-desc' },
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded bg-cream-100">
            {p.coverImage?.url ? (
              <Image src={p.coverImage.url} alt="" fill sizes="64px" className="object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <Link href={`/admin/blog/${p._id}`} className="block truncate font-medium hover:underline">
              {p.title}
            </Link>
            <p className="truncate text-xs text-muted">{p.tags?.join(', ')}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'published',
      header: 'Published',
      sort: { asc: 'oldest', desc: 'newest' },
      render: (p) => <span className="text-xs text-muted">{formatDate(p.publishedAt)}</span>,
    },
    {
      key: 'reading',
      header: 'Length',
      render: (p) => <span className="text-xs text-muted">{p.readingMinutes} min</span>,
    },
    { key: 'status', header: 'Status', render: (p) => <StatusPill status={p.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p) => (
        <RowActions>
          <RowButton
            onClick={() => applyStatus(p, p.status === 'published' ? 'draft' : 'published')}
            disabled={busyId === p._id}
            title={p.status === 'published' ? 'Move back to draft' : 'Publish to the Journal'}
          >
            {p.status === 'published' ? 'Unpublish' : 'Publish'}
          </RowButton>
          <RowLink href={`/admin/blog/${p._id}`} title="Edit this post">
            Edit
          </RowLink>
          <RowButton
            onClick={() => remove(p)}
            disabled={busyId === p._id}
            destructive
            title="Delete this post"
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
      : `${meta.total} ${meta.total === 1 ? 'post' : 'posts'}`
    : undefined;

  return (
    <div>
      <ListPageHeader
        title="Blog posts"
        description="Field notes and planning guides shown in the Journal."
        newHref="/admin/blog/new"
        newLabel="New post"
      />

      <ListToolbar
        search={params.q}
        onSearchChange={(q) => setParams({ q }, { replace: true })}
        searchPlaceholder="Search posts by title or excerpt"
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
        rows={posts}
        rowKey={(p) => p._id}
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
        emptyTitle={params.q ? 'No matching posts' : 'No posts yet'}
        emptyMessage={
          params.q
            ? `Nothing matched “${params.q}”. Try a shorter search, or clear it to see every post.`
            : 'Write your first article and it will appear in the Journal once published.'
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
              href="/admin/blog/new"
              className="inline-block rounded-full bg-gold-500 px-6 py-2.5 text-sm text-charcoal-950"
            >
              New post
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
export default function AdminBlogPage() {
  return (
    <Suspense>
      <AdminBlogView />
    </Suspense>
  );
}
