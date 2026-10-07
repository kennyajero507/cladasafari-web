'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { useListParams } from '@/lib/useListParams';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { ListPageHeader } from '@/components/admin/ListPageHeader';
import { ListToolbar } from '@/components/admin/ListToolbar';
import { Pagination } from '@/components/admin/Pagination';
import { RowActions, RowButton } from '@/components/admin/RowActions';
import { Modal } from '@/components/admin/Modal';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toasts';
import type { AdminUser, Role, PageMeta } from '@/types';

const PER_PAGE = 25;

const SORTS = [
  { value: 'name-asc', label: 'Name, A-Z' },
  { value: 'email-asc', label: 'Email, A-Z' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

interface Draft {
  id?: string;
  name: string;
  email: string;
  password: string;
  roleId: string;
}

const BLANK: Draft = { name: '', email: '', password: '', roleId: '' };

function formatDate(value?: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function AdminUsersView() {
  const { params, setParams } = useListParams({ page: '1', q: '', sort: 'name-asc', roleId: '' });
  const page = Number(params.page) || 1;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
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
      const query = new URLSearchParams({
        limit: String(PER_PAGE),
        page: String(page),
        sort: params.sort,
      });
      if (params.q) query.set('q', params.q);
      if (params.roleId) query.set('roleId', params.roleId);

      const { items, meta: pageMeta } = await adminApi.list<AdminUser>(`/api/admin/users?${query}`);
      setUsers(items);
      setMeta(pageMeta);
      setError('');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, [page, params.q, params.sort, params.roleId]);

  useEffect(() => {
    void load();
  }, [load]);

  // The role list drives both the filter chips and the editor's dropdown.
  useEffect(() => {
    adminApi
      .list<Role>('/api/admin/roles?limit=100')
      .then(({ items }) => setRoles(items))
      .catch(() => setRoles([]));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    setSaving(true);
    setFieldErrors({});

    try {
      if (editing.id) {
        // Only what changed: an absent password leaves the existing hash alone.
        const body: Record<string, unknown> = {
          name: editing.name,
          email: editing.email,
          roleId: editing.roleId,
        };
        if (editing.password) body.password = editing.password;
        await adminApi.patch(`/api/admin/users/${editing.id}`, body);
        toast({ message: 'User updated.' });
      } else {
        await adminApi.post('/api/admin/users', {
          name: editing.name,
          email: editing.email,
          password: editing.password,
          roleId: editing.roleId,
        });
        toast({ message: `${editing.name} can now sign in.` });
      }
      setEditing(null);
      await load();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not save that user.';
      if (err instanceof AdminApiError && err.details) setFieldErrors(err.details);
      toast({ tone: 'error', message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(user: AdminUser) {
    const ok = await confirm({
      title: `Delete ${user.name}?`,
      body: 'Their access is revoked immediately. This cannot be undone.',
      confirmLabel: 'Delete user',
    });
    if (!ok) return;

    setBusyId(user._id);
    try {
      await adminApi.remove(`/api/admin/users/${user._id}`);
      toast({ message: `${user.name} was removed.` });
      await load();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not delete that user.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBusyId(null);
    }
  }

  function openEditor(user?: AdminUser) {
    setFieldErrors({});
    setEditing(
      user
        ? {
            id: user._id,
            name: user.name,
            email: user.email,
            password: '',
            roleId: user.roleId ?? '',
          }
        : { ...BLANK, roleId: roles[0]?.id ?? '' }
    );
  }

  const columns: Column<AdminUser>[] = [
    {
      key: 'name',
      header: 'Name',
      primary: true,
      sort: { asc: 'name-asc', desc: 'name-asc' },
      render: (u) => (
        <button
          type="button"
          onClick={() => openEditor(u)}
          className="text-left font-medium hover:underline"
        >
          {u.name}
        </button>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (u) => <span className="text-xs text-muted">{u.email}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) =>
        u.role ? (
          <span className="inline-flex items-center rounded-full bg-leaf-50 px-2.5 py-1 text-xs text-charcoal-800">
            {u.role.name}
          </span>
        ) : (
          // roleId is nullable, and a null role grants nothing, so it is worth saying
          // plainly rather than showing an empty cell.
          <span className="text-xs text-maroon-700">No role: cannot do anything</span>
        ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last sign-in',
      hideOnMobile: true,
      render: (u) => <span className="text-xs text-muted">{formatDate(u.lastLoginAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (u) => (
        <RowActions>
          <RowButton onClick={() => openEditor(u)}>Edit</RowButton>
          <RowButton onClick={() => remove(u)} disabled={busyId === u._id} destructive>
            Delete
          </RowButton>
        </RowActions>
      ),
    },
  ];

  const resultLabel = meta
    ? params.q
      ? `${meta.total} ${meta.total === 1 ? 'result' : 'results'} for "${params.q}"`
      : `${meta.total} ${meta.total === 1 ? 'user' : 'users'}`
    : undefined;

  const selectedRole = roles.find((r) => r.id === editing?.roleId);

  return (
    <div>
      <ListPageHeader
        title="Users"
        description="Who can sign in to this dashboard, and what each of them may do."
      />

      <div className="mb-5">
        <button
          type="button"
          onClick={() => openEditor()}
          className="h-11 rounded-full bg-gold-500 px-6 text-sm font-medium text-charcoal-950 transition-colors hover:bg-gold-400"
        >
          Add user
        </button>
      </div>

      <ListToolbar
        search={params.q}
        onSearchChange={(q) => setParams({ q }, { replace: true })}
        searchPlaceholder="Search names and email addresses"
        sort={params.sort}
        sorts={SORTS}
        onSortChange={(sort) => setParams({ sort })}
        busy={loading}
        resultLabel={resultLabel}
        filters={[{ value: '', label: 'All roles' }, ...roles.map((r) => ({ value: r.id, label: r.name }))].map(
          (f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setParams({ roleId: f.value })}
              aria-pressed={params.roleId === f.value}
              className={`h-9 rounded-full px-4 text-xs transition-colors ${
                params.roleId === f.value
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
        rows={users}
        rowKey={(u) => u._id}
        loading={loading}
        sort={params.sort}
        onSortChange={(sort) => setParams({ sort })}
        emptyTitle={params.q ? 'No matching users' : 'No users yet'}
        emptyMessage={
          params.q
            ? `Nothing matched "${params.q}". Try a shorter search, or clear it to see everyone.`
            : 'Add the people who should be able to sign in to this dashboard.'
        }
      />

      <Pagination meta={meta} onPageChange={(next) => setParams({ page: String(next) })} busy={loading} />

      {editing ? (
        <Modal
          as="form"
          onSubmit={save}
          label={editing.id ? 'Edit user' : 'Add user'}
          onClose={() => setEditing(null)}
          className="max-w-lg"
        >
          <>
            <h2 className="mb-5 text-xl">{editing.id ? 'Edit user' : 'Add user'}</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="user-name" className="mb-1.5 block text-sm font-medium">
                  Full name *
                </label>
                <input
                  id="user-name"
                  required
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                />
                {fieldErrors.name ? (
                  <p className="mt-1 text-xs text-maroon-600">{fieldErrors.name}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="user-email" className="mb-1.5 block text-sm font-medium">
                  Email address *
                </label>
                <input
                  id="user-email"
                  type="email"
                  required
                  autoComplete="off"
                  value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                />
                {fieldErrors.email ? (
                  <p className="mt-1 text-xs text-maroon-600">{fieldErrors.email}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="user-password" className="mb-1.5 block text-sm font-medium">
                  {editing.id ? 'New password' : 'Password *'}
                </label>
                <input
                  id="user-password"
                  type="password"
                  required={!editing.id}
                  autoComplete="new-password"
                  value={editing.password}
                  onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                  className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-muted">
                  {editing.id
                    ? 'Leave blank to keep their current password. At least 12 characters.'
                    : 'At least 12 characters. Share it with them over a private channel.'}
                </p>
                {fieldErrors.password ? (
                  <p className="mt-1 text-xs text-maroon-600">{fieldErrors.password}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="user-role" className="mb-1.5 block text-sm font-medium">
                  Role *
                </label>
                <select
                  id="user-role"
                  required
                  value={editing.roleId}
                  onChange={(e) => setEditing({ ...editing, roleId: e.target.value })}
                  className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                >
                  <option value="" disabled>
                    Choose a role…
                  </option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted">
                  {selectedRole?.description || 'Determines what this person can do.'}
                </p>
                {fieldErrors.roleId ? (
                  <p className="mt-1 text-xs text-maroon-600">{fieldErrors.roleId}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-full bg-gold-500 px-6 text-sm font-medium text-charcoal-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
              >
                {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Create user'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="h-11 rounded-full border border-cream-300 px-6 text-sm transition-colors hover:border-gold-500"
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

export default function AdminUsersPage() {
  return (
    <Suspense fallback={null}>
      <AdminUsersView />
    </Suspense>
  );
}
