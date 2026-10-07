'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { ListPageHeader } from '@/components/admin/ListPageHeader';
import { RowActions, RowButton } from '@/components/admin/RowActions';
import { Modal } from '@/components/admin/Modal';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toasts';
import type { Role, PermissionGroup } from '@/types';

interface Draft {
  id?: string;
  name: string;
  description: string;
  permissions: Set<string>;
}

const BLANK: Draft = { name: '', description: '', permissions: new Set() };

function RolesView() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
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
      const { items } = await adminApi.list<Role>('/api/admin/roles?limit=100');
      setRoles(items);
      setError('');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load roles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // The catalogue comes from the API so a permission added in a later release
  // appears here without a matching frontend change.
  useEffect(() => {
    adminApi
      .get<{ groups: PermissionGroup[] }>('/api/admin/permissions')
      .then((data) => setGroups(data.groups))
      .catch(() => setGroups([]));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    setSaving(true);
    setFieldErrors({});

    const body = {
      name: editing.name,
      description: editing.description,
      permissions: [...editing.permissions],
    };

    try {
      if (editing.id) {
        await adminApi.patch(`/api/admin/roles/${editing.id}`, body);
        toast({ message: 'Role updated.' });
      } else {
        await adminApi.post('/api/admin/roles', body);
        toast({ message: `Role "${editing.name}" created.` });
      }
      setEditing(null);
      await load();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not save that role.';
      if (err instanceof AdminApiError && err.details) setFieldErrors(err.details);
      toast({ tone: 'error', message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(role: Role) {
    const ok = await confirm({
      title: `Delete the "${role.name}" role?`,
      body: 'This cannot be undone.',
      confirmLabel: 'Delete role',
    });
    if (!ok) return;

    setBusyId(role._id);
    try {
      await adminApi.remove(`/api/admin/roles/${role._id}`);
      toast({ message: 'Role deleted.' });
      await load();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not delete that role.';
      setError(message);
      toast({ tone: 'error', message });
    } finally {
      setBusyId(null);
    }
  }

  function openEditor(role?: Role) {
    setFieldErrors({});
    setEditing(
      role
        ? {
            id: role._id,
            name: role.name,
            description: role.description,
            permissions: new Set(role.permissions),
          }
        : { ...BLANK, permissions: new Set() }
    );
  }

  function toggle(key: string) {
    if (!editing) return;
    const next = new Set(editing.permissions);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setEditing({ ...editing, permissions: next });
  }

  function toggleGroup(group: PermissionGroup, on: boolean) {
    if (!editing) return;
    const next = new Set(editing.permissions);
    for (const p of group.permissions) {
      if (on) next.add(p.key);
      else next.delete(p.key);
    }
    setEditing({ ...editing, permissions: next });
  }

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: 'Role',
      primary: true,
      render: (r) => (
        <div>
          {r.locked ? (
            <span className="font-medium">{r.name}</span>
          ) : (
            <button
              type="button"
              onClick={() => openEditor(r)}
              className="text-left font-medium hover:underline"
            >
              {r.name}
            </button>
          )}
          {r.description ? <p className="mt-0.5 text-xs text-muted">{r.description}</p> : null}
        </div>
      ),
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (r) => (
        <span className="text-xs text-muted">
          {r.locked ? 'Everything' : `${r.permissions.length} granted`}
        </span>
      ),
    },
    {
      key: 'userCount',
      header: 'Users',
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-muted">{r.userCount ?? 0}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) =>
        r.locked ? (
          // The Administrator role is the recovery path out of a bad
          // permission change, so it is deliberately not editable.
          <span className="text-xs text-muted">Built in</span>
        ) : (
          <RowActions>
            <RowButton onClick={() => openEditor(r)}>Edit</RowButton>
            <RowButton onClick={() => remove(r)} disabled={busyId === r._id} destructive>
              Delete
            </RowButton>
          </RowActions>
        ),
    },
  ];

  return (
    <div>
      <ListPageHeader
        title="Roles"
        description="A role is a named set of permissions. Every user is assigned one."
      />

      <div className="mb-5">
        <button
          type="button"
          onClick={() => openEditor()}
          className="h-11 rounded-full bg-gold-500 px-6 text-sm font-medium text-charcoal-950 transition-colors hover:bg-gold-400"
        >
          New role
        </button>
      </div>

      {error ? (
        <p role="alert" className="mb-5 rounded-lg bg-maroon-600/10 px-4 py-3 text-sm text-maroon-700">
          {error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={roles}
        rowKey={(r) => r._id}
        loading={loading}
        emptyTitle="No roles yet"
        emptyMessage="Run the role seed, or create the first role here."
      />

      {editing ? (
        <Modal
          as="form"
          onSubmit={save}
          label={editing.id ? 'Edit role' : 'New role'}
          onClose={() => setEditing(null)}
          className="max-w-3xl"
        >
          <>
            <h2 className="mb-5 text-xl">{editing.id ? 'Edit role' : 'New role'}</h2>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="role-name" className="mb-1.5 block text-sm font-medium">
                    Role name *
                  </label>
                  <input
                    id="role-name"
                    required
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="e.g. Content Lead"
                    className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                  />
                  {fieldErrors.name ? (
                    <p className="mt-1 text-xs text-maroon-600">{fieldErrors.name}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="role-description" className="mb-1.5 block text-sm font-medium">
                    Description
                  </label>
                  <input
                    id="role-description"
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    placeholder="What this role is for"
                    className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                  />
                </div>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium">
                  Permissions{' '}
                  <span className="font-normal text-muted">
                    ({editing.permissions.size} selected)
                  </span>
                </legend>

                <div className="space-y-3">
                  {groups.map((group) => {
                    const keys = group.permissions.map((p) => p.key);
                    const all = keys.every((k) => editing.permissions.has(k));

                    return (
                      <div key={group.key} className="rounded-lg border border-cream-200 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-sm font-medium">{group.label}</h3>
                          <button
                            type="button"
                            onClick={() => toggleGroup(group, !all)}
                            className="text-xs text-muted underline-offset-2 hover:text-charcoal-900 hover:underline"
                          >
                            {all ? 'Clear all' : 'Select all'}
                          </button>
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                          {group.permissions.map((permission) => (
                            <label
                              key={permission.key}
                              className="flex cursor-pointer items-start gap-2.5"
                            >
                              <input
                                type="checkbox"
                                checked={editing.permissions.has(permission.key)}
                                onChange={() => toggle(permission.key)}
                                className="mt-0.5 h-4 w-4 shrink-0 accent-gold-500"
                              />
                              <span>
                                <span className="block text-sm text-ink">{permission.label}</span>
                                {permission.hint ? (
                                  <span className="block text-xs leading-snug text-muted">
                                    {permission.hint}
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {fieldErrors.permissions ? (
                  <p className="mt-2 text-xs text-maroon-600">{fieldErrors.permissions}</p>
                ) : null}
              </fieldset>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-full bg-gold-500 px-6 text-sm font-medium text-charcoal-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
              >
                {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Create role'}
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

export default function AdminRolesPage() {
  return (
    <Suspense fallback={null}>
      <RolesView />
    </Suspense>
  );
}
