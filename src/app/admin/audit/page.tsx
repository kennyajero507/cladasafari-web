'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { useListParams } from '@/lib/useListParams';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { ListPageHeader } from '@/components/admin/ListPageHeader';
import { Pagination } from '@/components/admin/Pagination';
import type { AuditEntry, PageMeta } from '@/types';

const PER_PAGE = 25;

const ACTIONS = [
  { value: '', label: 'All activity' },
  { value: 'user.create', label: 'User created' },
  { value: 'user.update', label: 'User edited' },
  { value: 'user.role_change', label: 'Role changed' },
  { value: 'user.delete', label: 'User deleted' },
  { value: 'role.create', label: 'Role created' },
  { value: 'role.update', label: 'Role edited' },
  { value: 'role.delete', label: 'Role deleted' },
];

const ACTION_LABELS: Record<string, string> = Object.fromEntries(
  ACTIONS.filter((a) => a.value).map((a) => [a.value, a.label])
);

function formatWhen(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Renders the { before, after } diff as readable lines. Permission arrays are
 * summarised by count: a role edit can move thirty of them at once, and the
 * full list would bury everything else.
 */
function summarise(changes: AuditEntry['changes']) {
  const after = changes?.after ?? {};
  const before = changes?.before ?? {};
  const keys = Object.keys(after);

  if (keys.length === 0) {
    const beforeKeys = Object.keys(before);
    if (beforeKeys.length === 0) return null;
    return beforeKeys
      .map((k) => `${k}: ${Array.isArray(before[k]) ? `${(before[k] as unknown[]).length} items` : String(before[k])}`)
      .join(', ');
  }

  return keys
    .map((key) => {
      const now = after[key];
      const was = before[key];

      if (key === 'passwordChanged') return 'password reset';
      if (Array.isArray(now)) {
        const wasCount = Array.isArray(was) ? was.length : 0;
        return `permissions: ${wasCount} → ${now.length}`;
      }
      if (was === undefined || was === null) return `${key}: ${String(now)}`;
      return `${key}: ${String(was)} → ${String(now)}`;
    })
    .join(', ');
}

function AuditView() {
  const { params, setParams } = useListParams({ page: '1', action: '' });
  const page = Number(params.page) || 1;

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: String(PER_PAGE), page: String(page) });
      if (params.action) query.set('action', params.action);

      const { items, meta: pageMeta } = await adminApi.list<AuditEntry>(`/api/admin/audit?${query}`);
      setEntries(items);
      setMeta(pageMeta);
      setError('');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load the audit log.');
    } finally {
      setLoading(false);
    }
  }, [page, params.action]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<AuditEntry>[] = [
    {
      key: 'action',
      header: 'Action',
      primary: true,
      render: (e) => (
        <div>
          <p className="font-medium">{ACTION_LABELS[e.action] ?? e.action}</p>
          {e.targetLabel ? <p className="mt-0.5 text-xs text-muted">{e.targetLabel}</p> : null}
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'By',
      render: (e) => <span className="text-xs text-muted">{e.actorEmail}</span>,
    },
    {
      key: 'changes',
      header: 'Details',
      hideOnMobile: true,
      render: (e) => {
        const text = summarise(e.changes);
        return text ? (
          <span className="text-xs text-muted">{text}</span>
        ) : (
          <span className="text-xs text-muted">–</span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'When',
      render: (e) => <span className="text-xs text-muted">{formatWhen(e.createdAt)}</span>,
    },
  ];

  return (
    <div>
      <ListPageHeader
        title="Audit log"
        description="Who changed dashboard access, and when. Entries are never edited or removed."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => setParams({ action: a.value, page: '1' })}
            aria-pressed={params.action === a.value}
            className={`h-9 rounded-full px-4 text-xs transition-colors ${
              params.action === a.value
                ? 'bg-gold-500 text-charcoal-950'
                : 'border border-cream-300 text-muted hover:border-gold-500'
            }`}
          >
            {a.label}
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
        rows={entries}
        rowKey={(e) => e._id}
        loading={loading}
        emptyTitle="Nothing recorded yet"
        emptyMessage="User and role changes will appear here as they happen."
      />

      <Pagination meta={meta} onPageChange={(next) => setParams({ page: String(next) })} busy={loading} />
    </div>
  );
}

export default function AdminAuditPage() {
  return (
    <Suspense fallback={null}>
      <AuditView />
    </Suspense>
  );
}
