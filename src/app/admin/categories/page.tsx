'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { useListParams } from '@/lib/useListParams';
import { buildCategoryTree } from '@/lib/useCatalogOptions';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatusPill } from '@/components/admin/StatusPill';
import { ListPageHeader } from '@/components/admin/ListPageHeader';
import { ListToolbar } from '@/components/admin/ListToolbar';
import { RowActions, RowButton, TrashIcon } from '@/components/admin/RowActions';
import { Modal } from '@/components/admin/Modal';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toasts';
import type { ApiImage, Category, CategoryKind } from '@/types';

const KINDS: { value: CategoryKind; label: string; hint: string }[] = [
  { value: 'local', label: 'Kenyan holiday package', hint: 'Prices in KES; departure point and dates.' },
  { value: 'international', label: 'International holiday', hint: 'Visa support and flights.' },
  { value: 'safari', label: 'Safari', hint: 'Parks, game drives and conservancy fees.' },
];

const SORTS = [
  { value: 'order-asc', label: 'Menu order' },
  { value: 'name-asc', label: 'Name, A-Z' },
];

interface Draft {
  _id?: string;
  name: string;
  slug: string;
  parent: string;
  kind: CategoryKind;
  navLabel: string;
  eyebrow: string;
  description: string;
  heroImage?: ApiImage;
  order: number;
  status: 'draft' | 'published';
}

const BLANK: Draft = {
  name: '',
  slug: '',
  parent: '',
  kind: 'local',
  navLabel: '',
  eyebrow: '',
  description: '',
  order: 0,
  status: 'draft',
};

function toDraft(c: Category): Draft {
  return {
    _id: c._id,
    name: c.name,
    slug: c.slug,
    parent: c.parent?.slug ?? '',
    kind: c.kind,
    // The API returns navLabel as the name when none is set; keep the field blank then.
    navLabel: c.navLabel === c.name ? '' : c.navLabel,
    eyebrow: c.eyebrow,
    description: c.description,
    heroImage: c.heroImage ?? undefined,
    order: c.order,
    status: c.status,
  };
}

const input = 'w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none';

type Row = Category & { depth: 0 | 1 };

/**
 * The product lines: top-level groups (Safaris) and the categories packages
 * sit in (Kenyan Safaris). The menu, footer, homepage sections and package
 * filters are all built from this tree, so it is kept to those two levels.
 */
function AdminCategoriesView() {
  const { params, setParams } = useListParams({ q: '', sort: 'order-asc', status: '' });
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The whole set (it is small), so the tree can be drawn and filtered here.
      const { items } = await adminApi.list<Category>('/api/admin/categories?limit=100&sort=order-asc');
      setRows(items);
      setError('');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tree = useMemo(() => buildCategoryTree(rows), [rows]);

  const visible: Row[] = useMemo(() => {
    const q = params.q.trim().toLowerCase();
    const match = (c: Category) =>
      (!q || c.name.toLowerCase().includes(q) || c.slug.includes(q)) && (!params.status || c.status === params.status);
    const ordered =
      params.sort === 'name-asc'
        ? [...tree].sort((a, b) => a.name.localeCompare(b.name))
        : tree;
    return ordered.flatMap((group) => {
      const children = (group.children ?? [])
        .filter(match)
        .sort((a, b) => (params.sort === 'name-asc' ? a.name.localeCompare(b.name) : 0));
      // A group stays visible while any of its categories matches, for context.
      return match(group) || children.length
        ? [{ ...group, depth: 0 as const }, ...children.map((c) => ({ ...c, depth: 1 as const }))]
        : [];
    });
  }, [tree, params.q, params.status, params.sort]);

  function startNew(parent?: Category) {
    setFieldErrors({});
    setEditing({ ...BLANK, parent: parent?.slug ?? '', kind: parent?.kind ?? 'local' });
  }

  function startEdit(c: Category) {
    setFieldErrors({});
    setEditing(toDraft(c));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFieldErrors({});
    const body: Record<string, unknown> = {
      name: editing.name,
      parent: editing.parent || null,
      kind: editing.kind,
      navLabel: editing.navLabel,
      eyebrow: editing.eyebrow,
      description: editing.description,
      heroImage: editing.heroImage?.url ? editing.heroImage : null,
      order: Number(editing.order) || 0,
      status: editing.status,
    };
    const original = rows.find((r) => r._id === editing._id);
    // Only an explicit change renames the URL; the API keeps slugs on rename.
    if (editing.slug && editing.slug !== original?.slug) body.slug = editing.slug;
    try {
      if (editing._id) await adminApi.patch(`/api/admin/categories/${editing._id}`, body);
      else await adminApi.post('/api/admin/categories', body);
      toast({ message: editing._id ? 'Category saved.' : `“${editing.name}” created.` });
      setEditing(null);
      await load();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setFieldErrors(err.details ?? {});
        toast({ tone: 'error', message: err.message });
      } else {
        toast({ tone: 'error', message: 'Could not save the category.' });
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: Category) {
    setBusyId(c._id);
    const next = c.status === 'published' ? 'draft' : 'published';
    try {
      await adminApi.patch(`/api/admin/categories/${c._id}/status`, { status: next });
      toast({
        message:
          next === 'published'
            ? `“${c.name}” is now in the menu and filters.`
            : `“${c.name}” is hidden from the menu and filters. Its packages stay live.`,
      });
      await load();
    } catch (err) {
      toast({ tone: 'error', message: err instanceof AdminApiError ? err.message : 'Could not change status.' });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c: Category) {
    const ok = await confirm({
      title: 'Delete this category?',
      body: (
        <>
          <strong className="text-ink">{c.name}</strong> will be removed from the menu and filters. A category that
          still holds packages or other categories cannot be deleted.
        </>
      ),
      confirmLabel: 'Delete category',
    });
    if (!ok) return;
    setBusyId(c._id);
    try {
      await adminApi.remove(`/api/admin/categories/${c._id}`);
      toast({ message: 'Category deleted.' });
      await load();
    } catch (err) {
      toast({ tone: 'error', message: err instanceof AdminApiError ? err.message : 'Could not delete.' });
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Category',
      render: (c) => (
        <button type="button" onClick={() => startEdit(c)} className={`text-left ${c.depth ? 'pl-6' : ''}`}>
          <span className={`block hover:underline ${c.depth ? '' : 'font-medium'}`}>
            {c.depth ? <span aria-hidden className="mr-1.5 text-muted">└</span> : null}
            {c.name}
            {c.depth === 0 && c.children?.length ? <span className="ml-2 text-xs text-muted">group</span> : null}
          </span>
          <span className="text-xs text-muted">/{c.slug}</span>
        </button>
      ),
    },
    {
      key: 'kind',
      header: 'Type',
      hideOnMobile: true,
      render: (c) => <span className="text-xs text-muted">{KINDS.find((k) => k.value === c.kind)?.label}</span>,
    },
    {
      key: 'tours',
      header: 'Packages',
      render: (c) => {
        const count = c.depth === 0 && c.children?.length
          ? (c.children ?? []).reduce((sum, child) => sum + (child.tourCount ?? 0), c.tourCount ?? 0)
          : c.tourCount ?? 0;
        return <span className="text-xs text-muted">{count}</span>;
      },
    },
    { key: 'order', header: 'Order', hideOnMobile: true, render: (c) => <span className="text-xs text-muted">{c.order}</span> },
    { key: 'status', header: 'Status', render: (c) => <StatusPill status={c.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <RowActions>
          {c.depth === 0 ? <RowButton onClick={() => startNew(c)}>Add inside</RowButton> : null}
          <RowButton onClick={() => toggle(c)} disabled={busyId === c._id}>
            {c.status === 'published' ? 'Unpublish' : 'Publish'}
          </RowButton>
          <RowButton onClick={() => startEdit(c)}>Edit</RowButton>
          <RowButton onClick={() => remove(c)} disabled={busyId === c._id} destructive icon={<TrashIcon />}>
            <span className="sr-only">Delete</span>
          </RowButton>
        </RowActions>
      ),
    },
  ];

  const editingRow = editing?._id ? rows.find((r) => r._id === editing._id) : undefined;
  const hasChildren = Boolean(editingRow && rows.some((r) => r.parent?.slug === editingRow.slug));
  // Possible parents: top-level groups other than itself that hold no packages directly.
  const parentOptions = tree.filter((g) => g._id !== editing?._id && (g.children?.length || !g.tourCount));

  return (
    <div>
      <ListPageHeader
        title="Categories"
        description="Product lines for the menu, footer and package filters. Packages go in the categories inside a group."
      />
      <div className="mb-5">
        <button
          type="button"
          onClick={() => startNew()}
          className="h-11 rounded-full bg-gold-500 px-6 text-sm font-medium text-charcoal-950 transition-colors hover:bg-gold-400"
        >
          New category
        </button>
      </div>

      <ListToolbar
        search={params.q}
        onSearchChange={(q) => setParams({ q }, { replace: true })}
        searchPlaceholder="Search categories"
        sort={params.sort}
        sorts={SORTS}
        onSortChange={(sort) => setParams({ sort })}
        busy={loading}
        resultLabel={`${rows.length} ${rows.length === 1 ? 'category' : 'categories'}`}
      />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {[
          { value: '', label: 'All' },
          { value: 'published', label: 'Published' },
          { value: 'draft', label: 'Drafts' },
        ].map((s) => (
          <button
            key={s.value}
            type="button"
            aria-pressed={params.status === s.value}
            onClick={() => setParams({ status: s.value })}
            className={`rounded-full px-4 py-1.5 text-xs ${
              params.status === s.value ? 'bg-charcoal-900 text-cream-50' : 'border border-cream-300 bg-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mb-5 rounded-lg bg-maroon-600/10 px-4 py-3 text-sm text-maroon-700">
          {error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(c) => c._id}
        loading={loading}
        emptyTitle="No categories match"
        emptyMessage="Clear the search, or create the first product line."
      />

      {editing ? (
        <Modal
          as="form"
          onSubmit={save}
          label={editing._id ? 'Edit category' : 'New category'}
          onClose={() => setEditing(null)}
          className="max-w-2xl"
        >
          <>
            <h2 className="mb-5 text-xl">{editing._id ? `Edit ${editingRow?.name ?? 'category'}` : 'New category'}</h2>
            <div className="space-y-4">
              <Field id="cat-name" label="Name *" error={fieldErrors.name}>
                <input id="cat-name" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={input} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="cat-parent"
                  label="Sits inside"
                  error={fieldErrors.parent}
                  hint={hasChildren ? 'It has categories inside it, so it stays a top-level group.' : 'Top-level groups appear in the menu with their categories beneath.'}
                >
                  <select
                    id="cat-parent"
                    disabled={hasChildren}
                    value={editing.parent}
                    onChange={(e) => {
                      const parent = tree.find((g) => g.slug === e.target.value);
                      setEditing({ ...editing, parent: e.target.value, kind: editing._id ? editing.kind : parent?.kind ?? editing.kind });
                    }}
                    className={`${input} bg-white`}
                  >
                    <option value="">(nothing: a top-level group)</option>
                    {parentOptions.map((g) => (
                      <option key={g.slug} value={g.slug}>
                        {g.name}
                        {g.status === 'draft' ? ' (draft)' : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="cat-kind" label="Type of trip *" error={fieldErrors.kind} hint={KINDS.find((k) => k.value === editing.kind)?.hint}>
                  <select
                    id="cat-kind"
                    value={editing.kind}
                    onChange={(e) => setEditing({ ...editing, kind: e.target.value as CategoryKind })}
                    className={`${input} bg-white`}
                  >
                    {KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="cat-nav" label="Menu label" error={fieldErrors.navLabel} hint="Blank uses the name.">
                  <input id="cat-nav" maxLength={80} value={editing.navLabel} onChange={(e) => setEditing({ ...editing, navLabel: e.target.value })} className={input} />
                </Field>
                <Field id="cat-eyebrow" label="Eyebrow" error={fieldErrors.eyebrow} hint="Small line above the banner title.">
                  <input id="cat-eyebrow" maxLength={80} value={editing.eyebrow} onChange={(e) => setEditing({ ...editing, eyebrow: e.target.value })} className={input} />
                </Field>
              </div>

              <Field id="cat-description" label="Description" error={fieldErrors.description} hint="Banner subtitle on the filtered packages page.">
                <textarea id="cat-description" rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className={input} />
              </Field>

              <ImageUploader
                label="Banner photograph"
                value={editing.heroImage}
                onChange={(v) => setEditing({ ...editing, heroImage: v ?? undefined })}
                error={fieldErrors.heroImage}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                {editing._id ? (
                  <Field id="cat-slug" label="Address" error={fieldErrors.slug} hint="Changing it breaks saved links.">
                    <input id="cat-slug" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className={input} />
                  </Field>
                ) : null}
                <Field id="cat-order" label="Order" error={fieldErrors.order} hint="Lower comes first.">
                  <input id="cat-order" type="number" min={0} value={editing.order} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} className={input} />
                </Field>
                <Field id="cat-status" label="Status" error={fieldErrors.status}>
                  <select id="cat-status" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as Draft['status'] })} className={`${input} bg-white`}>
                    <option value="draft">Draft: hidden</option>
                    <option value="published">Published: in the menu</option>
                  </select>
                </Field>
              </div>

              {editingRow?.status === 'published' ? (
                <p className="text-xs text-muted">
                  <Link href={`/tours?category=${editingRow.slug}`} target="_blank" className="text-leaf-700 underline">
                    View its packages on the site ↗
                  </Link>
                </p>
              ) : null}
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

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-maroon-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export default function AdminCategoriesPage() {
  return (
    <Suspense>
      <AdminCategoriesView />
    </Suspense>
  );
}
