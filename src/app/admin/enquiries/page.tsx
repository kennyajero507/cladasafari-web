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
import { EnquiryTimeline } from '@/components/admin/EnquiryTimeline';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toasts';
import { formatDate, formatPrice } from '@/lib/format';
import type { AdminSummary, Enquiry, EnquiryStatus, PageMeta } from '@/types';

/**
 * The pipeline, in order. `won`/`lost` are terminal; everything before them is
 * live work. Labels differ from the stored values because "won"/"lost" are
 * internal words: staff think in terms of booked and closed.
 */
const PIPELINE: { value: EnquiryStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'won', label: 'Booked' },
  { value: 'lost', label: 'Closed' },
];

const OPEN_STATUSES = 'new,assigned,in_progress,quoted';

/**
 * Filters are ordered by how often they are the answer to "what should I do
 * next": open work first, the full pipeline after, archives last.
 */
const FILTERS: { value: string; label: string }[] = [
  { value: OPEN_STATUSES, label: 'Open' },
  ...PIPELINE.map((s) => ({ value: s.value, label: s.label })),
  { value: '', label: 'All' },
];

const SORTS = [
  { value: 'oldest-open', label: 'Needs picking up' },
  { value: 'follow-up', label: 'Follow-up due' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name, A-Z' },
];

const PER_PAGE = 25;

/** Local midnight `n` days out, as the yyyy-mm-dd the API parses. */
function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function AdminEnquiriesView() {
  const { params, setParams } = useListParams({
    page: '1',
    q: '',
    sort: 'oldest-open',
    status: OPEN_STATUSES,
    assignee: '',
    overdue: '',
  });
  const page = Number(params.page) || 1;

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [staff, setStaff] = useState<AdminSummary[]>([]);
  const [me, setMe] = useState<{ id: string; permissions?: string[] } | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirm, confirmDialog] = useConfirm();
  const { toast } = useToast();

  const canAssignOthers = me?.permissions?.includes('enquiries.assign') ?? false;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        limit: String(PER_PAGE),
        page: String(page),
        sort: params.sort,
      });
      if (params.status) query.set('status', params.status);
      if (params.q) query.set('q', params.q);
      if (params.assignee) query.set('assignee', params.assignee);
      if (params.overdue === 'true') query.set('overdue', 'true');

      const { items, meta: pageMeta } = await adminApi.list<Enquiry>(
        `/api/admin/enquiries?${query}`
      );
      setEnquiries(items);
      setMeta(pageMeta);
      setError('');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load enquiries.');
    } finally {
      setLoading(false);
    }
  }, [page, params.q, params.sort, params.status, params.assignee, params.overdue]);

  useEffect(() => {
    load();
  }, [load]);

  // Who am I, and who can I hand work to. Both are small and rarely change, so
  // they are fetched once rather than with every list refresh.
  useEffect(() => {
    adminApi
      .get<{ id: string; permissions?: string[] }>('/api/auth/me')
      .then(setMe)
      .catch(() => setMe(null));
    adminApi
      .list<AdminSummary>('/api/admin/enquiries/assignable')
      .then(({ items }) => setStaff(items))
      .catch(() => setStaff([]));
  }, []);

  useEffect(() => {
    setChecked((current) => {
      if (current.size === 0) return current;
      const visible = new Set(enquiries.map((e) => e._id));
      const next = new Set([...current].filter((id) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [enquiries]);

  /** Merge a server response into the list and the open detail pane. */
  function applyUpdate(updated: Enquiry) {
    setEnquiries((list) => list.map((e) => (e._id === updated._id ? { ...e, ...updated } : e)));
    setSelected((s) => (s && s._id === updated._id ? { ...s, ...updated } : s));
  }

  function fail(err: unknown, fallback: string) {
    const message = err instanceof AdminApiError ? err.message : fallback;
    setError(message);
    toast({ tone: 'error', message });
  }

  async function open(enquiry: Enquiry) {
    // The row carries no timeline; the detail endpoint does.
    setSelected(enquiry);
    try {
      const full = await adminApi.get<Enquiry>(`/api/admin/enquiries/${enquiry._id}`);
      setSelected(full);
    } catch {
      /* Keep the row's data on screen rather than closing the pane. */
    }
  }

  async function changeStatus(id: string, status: EnquiryStatus) {
    setBusy(true);
    try {
      const updated = await adminApi.patch<Enquiry>(`/api/admin/enquiries/${id}/status`, {
        status,
      });
      applyUpdate(updated);
      if (selected?._id === id) await open(updated);
      setError('');
      toast({ message: `Moved to ${PIPELINE.find((s) => s.value === status)?.label}.` });
    } catch (err) {
      fail(err, 'Could not update the enquiry.');
    } finally {
      setBusy(false);
    }
  }

  async function setAssignee(id: string, assigneeId: string | null | undefined) {
    setBusy(true);
    try {
      // An omitted assigneeId is the self-claim path on the API.
      const body = assigneeId === undefined ? {} : { assigneeId };
      const updated = await adminApi.patch<Enquiry>(
        `/api/admin/enquiries/${id}/assignee`,
        body
      );
      applyUpdate(updated);
      if (selected?._id === id) await open(updated);
      setError('');
      toast({
        message: updated.assignee
          ? `Assigned to ${updated.assignee.name}.`
          : 'Returned to the unassigned queue.',
      });
    } catch (err) {
      fail(err, 'Could not reassign the enquiry.');
      // A conflict means someone else took it; refresh so the list tells the truth.
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function addNote(id: string, note: string) {
    setBusy(true);
    try {
      const updated = await adminApi.post<Enquiry>(`/api/admin/enquiries/${id}/notes`, { note });
      setSelected(updated);
      setError('');
      toast({ message: 'Note added.' });
    } catch (err) {
      fail(err, 'Could not add the note.');
    } finally {
      setBusy(false);
    }
  }

  async function recordContact(id: string, note: string, followUpAt: string | null) {
    setBusy(true);
    try {
      const updated = await adminApi.post<Enquiry>(`/api/admin/enquiries/${id}/contacted`, {
        ...(note ? { note } : {}),
        followUpAt,
      });
      applyUpdate(updated);
      await open(updated);
      setError('');
      toast({
        message: followUpAt
          ? `Logged. Following up ${formatDate(followUpAt)}.`
          : 'Contact logged.',
      });
    } catch (err) {
      fail(err, 'Could not record that contact.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(enquiry: Enquiry) {
    const ok = await confirm({
      title: 'Delete this enquiry?',
      body: (
        <>
          The enquiry from <strong className="text-ink">{enquiry.name}</strong> ({enquiry.email})
          and its entire history will be permanently removed. This cannot be undone.
        </>
      ),
      confirmLabel: 'Delete enquiry',
    });
    if (!ok) return;

    try {
      await adminApi.remove(`/api/admin/enquiries/${enquiry._id}`);
      setSelected(null);
      setError('');
      toast({ message: `Enquiry from ${enquiry.name} was deleted.` });
      await load();
    } catch (err) {
      fail(err, 'Could not delete the enquiry.');
    }
  }

  async function bulkStatus(status: EnquiryStatus) {
    const ids = [...checked];
    setBulkBusy(true);
    try {
      await adminApi.bulkStatus('enquiries', ids, status);
      // No undo offered here: each move appends to the enquiries' timelines, and
      // an undo would write a second, misleading set of entries rather than
      // erasing the first.
      toast({
        message: `${ids.length} ${ids.length === 1 ? 'enquiry' : 'enquiries'} moved to ${
          PIPELINE.find((s) => s.value === status)?.label
        }.`,
      });
      setChecked(new Set());
      await load();
    } catch (err) {
      fail(err, 'Could not update those enquiries.');
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkAssign(assigneeId: string | null) {
    const ids = [...checked];
    setBulkBusy(true);
    try {
      await adminApi.patch('/api/admin/enquiries/bulk/assign', { ids, assigneeId });
      toast({
        message: assigneeId
          ? `${ids.length} assigned to ${staff.find((s) => s._id === assigneeId)?.name ?? 'them'}.`
          : `${ids.length} returned to the queue.`,
      });
      setChecked(new Set());
      await load();
    } catch (err) {
      fail(err, 'Could not assign those enquiries.');
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    const ids = [...checked];
    const ok = await confirm({
      title: `Delete ${ids.length} ${ids.length === 1 ? 'enquiry' : 'enquiries'}?`,
      body: 'They and their histories will be permanently removed. This cannot be undone.',
      confirmLabel: `Delete ${ids.length}`,
    });
    if (!ok) return;

    setBulkBusy(true);
    try {
      await adminApi.bulkRemove('enquiries', ids);
      toast({ message: `${ids.length} ${ids.length === 1 ? 'enquiry' : 'enquiries'} deleted.` });
      setChecked(new Set());
      await load();
    } catch (err) {
      fail(err, 'Could not delete those enquiries.');
    } finally {
      setBulkBusy(false);
    }
  }

  const columns: Column<Enquiry>[] = [
    {
      key: 'name',
      header: 'From',
      primary: true,
      sort: { asc: 'name-asc', desc: 'name-asc' },
      render: (e) => (
        <button type="button" onClick={() => open(e)} className="text-left">
          <span className="block font-medium hover:underline">{e.name}</span>
          <span className="block text-xs text-muted">
            {e.reference ? `${e.reference} · ` : ''}
            {e.email}
          </span>
        </button>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (e) => (
        <span className="text-xs text-muted">
          {e.type === 'booking' ? `Booking · ${e.tourTitle ?? '–'}` : 'Contact'}
        </span>
      ),
    },
    {
      key: 'assignee',
      header: 'Owner',
      render: (e) =>
        e.assignee ? (
          <span className="text-xs">{e.assignee.name}</span>
        ) : (
          <button
            type="button"
            onClick={() => setAssignee(e._id, undefined)}
            disabled={busy}
            className="rounded-full border border-cream-300 px-2.5 py-1 text-xs text-muted transition-colors hover:border-gold-500 hover:text-ink disabled:opacity-50"
            title="Assign this enquiry to yourself"
          >
            Claim
          </button>
        ),
    },
    {
      key: 'received',
      header: 'Received',
      sort: { asc: 'oldest', desc: 'newest' },
      render: (e) => (
        <span className="text-xs text-muted">
          {formatDate(e.createdAt)}
          {e.isOverdue ? (
            <span className="ml-1.5 rounded-full bg-maroon-600/10 px-1.5 py-0.5 text-maroon-700">
              follow-up due
            </span>
          ) : null}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (e) => <StatusPill status={e.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (e) => (
        <RowActions>
          <RowButton onClick={() => open(e)} title="Open this enquiry">
            Open
          </RowButton>
          <RowButton onClick={() => remove(e)} destructive title="Delete this enquiry" icon={<TrashIcon />}>
            <span className="sr-only">Delete</span>
          </RowButton>
        </RowActions>
      ),
    },
  ];

  const resultLabel = meta
    ? params.q
      ? `${meta.total} ${meta.total === 1 ? 'result' : 'results'} for “${params.q}”`
      : `${meta.total} ${meta.total === 1 ? 'enquiry' : 'enquiries'}`
    : undefined;

  const mineActive = params.assignee === 'me';
  const unassignedActive = params.assignee === 'unassigned';
  const overdueActive = params.overdue === 'true';

  return (
    <div>
      <ListPageHeader
        title="Enquiries"
        description="Contact and booking requests from the public site, from first contact to booked."
      />

      {/* Queue shortcuts. These answer "what needs me", which the status
          filters below cannot: an enquiry can be In progress and still be the
          most urgent thing on the list because its follow-up has lapsed. */}
      <div className="mb-4 flex flex-wrap gap-2">
        <QueueChip
          active={mineActive}
          onClick={() =>
            setParams({ assignee: mineActive ? '' : 'me', overdue: '', page: '1' })
          }
        >
          Mine
        </QueueChip>
        <QueueChip
          active={unassignedActive}
          count={meta?.unassignedCount}
          onClick={() =>
            setParams({
              assignee: unassignedActive ? '' : 'unassigned',
              overdue: '',
              page: '1',
            })
          }
        >
          Unassigned
        </QueueChip>
        <QueueChip
          active={overdueActive}
          count={meta?.overdueCount}
          tone="urgent"
          onClick={() =>
            setParams({
              overdue: overdueActive ? '' : 'true',
              status: overdueActive ? params.status : '',
              page: '1',
            })
          }
        >
          Follow-up due
        </QueueChip>
      </div>

      <ListToolbar
        search={params.q}
        onSearchChange={(q) => setParams({ q }, { replace: true })}
        searchPlaceholder="Search by reference, name, email or message"
        sort={params.sort}
        sorts={SORTS}
        onSortChange={(sort) => setParams({ sort })}
        busy={loading}
        resultLabel={resultLabel}
        filters={FILTERS.map((f) => {
          const active = params.status === f.value;
          const count = f.value.includes(',') || f.value === '' ? undefined : meta?.statusCounts?.[f.value as EnquiryStatus];
          return (
            <button
              key={f.value || 'all'}
              type="button"
              onClick={() => setParams({ status: f.value, page: '1' })}
              aria-pressed={active}
              className={`h-9 rounded-full px-4 text-xs transition-colors ${
                active
                  ? 'bg-gold-500 text-charcoal-950'
                  : 'border border-cream-300 text-muted hover:border-gold-500'
              }`}
            >
              {f.label}
              {count ? <span className="ml-1.5 opacity-70">{count}</span> : null}
            </button>
          );
        })}
      />

      {error ? (
        <p role="alert" className="mb-5 rounded-lg bg-maroon-600/10 px-4 py-3 text-sm text-maroon-700">
          {error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={enquiries}
        rowKey={(e) => e._id}
        loading={loading}
        sort={params.sort}
        onSortChange={(sort) => setParams({ sort })}
        selected={checked}
        onSelectedChange={setChecked}
        bulkBar={
          <BulkBar count={checked.size} onClear={() => setChecked(new Set())} busy={bulkBusy}>
            {canAssignOthers ? (
              <select
                aria-label="Assign selected to"
                defaultValue=""
                disabled={bulkBusy}
                onChange={(event) => {
                  const value = event.target.value;
                  event.target.value = '';
                  if (value) bulkAssign(value === 'unassign' ? null : value);
                }}
                className="h-9 rounded-full border border-cream-300 bg-white px-3 text-xs"
              >
                <option value="">Assign to…</option>
                {staff.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
                <option value="unassign">Return to queue</option>
              </select>
            ) : null}
            <BulkButton onClick={() => bulkStatus('quoted')} disabled={bulkBusy}>
              Mark quoted
            </BulkButton>
            <BulkButton onClick={() => bulkStatus('won')} disabled={bulkBusy}>
              Mark booked
            </BulkButton>
            <BulkButton onClick={() => bulkStatus('lost')} disabled={bulkBusy}>
              Close
            </BulkButton>
            <BulkButton onClick={bulkDelete} disabled={bulkBusy} destructive>
              Delete
            </BulkButton>
          </BulkBar>
        }
        emptyTitle={params.q ? 'No matching enquiries' : 'Nothing here'}
        emptyMessage={
          params.q
            ? `Nothing matched “${params.q}”. Try a shorter search, or clear it to see them all.`
            : 'Submissions from the contact and booking forms will appear here.'
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

      {selected ? (
        <EnquiryDetail
          enquiry={selected}
          staff={staff}
          meId={me?.id}
          canAssignOthers={canAssignOthers}
          busy={busy}
          onClose={() => setSelected(null)}
          onStatus={(status) => changeStatus(selected._id, status)}
          onAssign={(id) => setAssignee(selected._id, id)}
          onNote={(note) => addNote(selected._id, note)}
          onContact={(note, followUpAt) => recordContact(selected._id, note, followUpAt)}
          onDelete={() => remove(selected)}
        />
      ) : null}

      {confirmDialog}
    </div>
  );
}

function QueueChip({
  active,
  count,
  tone = 'normal',
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  tone?: 'normal' | 'urgent';
  onClick: () => void;
  children: React.ReactNode;
}) {
  const urgent = tone === 'urgent' && (count ?? 0) > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs transition-colors ${
        active
          ? 'bg-gold-500 text-charcoal-950'
          : urgent
            ? 'border border-maroon-600/30 bg-maroon-600/5 text-maroon-700 hover:border-maroon-600'
            : 'border border-cream-300 text-muted hover:border-gold-500'
      }`}
    >
      {children}
      {count ? <span className="opacity-80">{count}</span> : null}
    </button>
  );
}

function EnquiryDetail({
  enquiry,
  staff,
  meId,
  canAssignOthers,
  busy,
  onClose,
  onStatus,
  onAssign,
  onNote,
  onContact,
  onDelete,
}: {
  enquiry: Enquiry;
  staff: AdminSummary[];
  meId?: string;
  canAssignOthers: boolean;
  busy: boolean;
  onClose: () => void;
  onStatus: (status: EnquiryStatus) => void;
  onAssign: (assigneeId: string | null | undefined) => void;
  onNote: (note: string) => void;
  onContact: (note: string, followUpAt: string | null) => void;
  onDelete: () => void;
}) {
  const [note, setNote] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [followUp, setFollowUp] = useState(inDays(3));

  // A fresh enquiry means fresh drafts; without this the note box keeps text
  // typed against whichever enquiry was open before.
  useEffect(() => {
    setNote('');
    setContactNote('');
    setFollowUp(inDays(3));
  }, [enquiry._id]);

  const mine = enquiry.assignee?._id === meId;

  return (
    <Modal
      label={`Enquiry ${enquiry.reference ?? ''} from ${enquiry.name}`}
      onClose={onClose}
      className="max-w-3xl"
    >
      <>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">
              {enquiry.reference ?? 'Enquiry'}
            </p>
            <h2 className="text-xl">{enquiry.name}</h2>
            <a href={`mailto:${enquiry.email}`} className="text-sm text-leaf-700 underline">
              {enquiry.email}
            </a>
            {enquiry.phone ? (
              <>
                {' · '}
                <a href={`tel:${enquiry.phone}`} className="text-sm text-leaf-700 underline">
                  {enquiry.phone}
                </a>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-2xl leading-none text-muted hover:text-ink"
          >
            ×
          </button>
        </div>

        {/* The stepper doubles as the control: clicking a stage moves the
            enquiry there, so progressing it is one action rather than opening
            a menu. */}
        <div className="mb-5 flex flex-wrap items-center gap-1.5 border-y border-cream-200 py-4">
          {PIPELINE.map((stage) => (
            <button
              key={stage.value}
              type="button"
              disabled={busy || enquiry.status === stage.value}
              onClick={() => onStatus(stage.value)}
              aria-current={enquiry.status === stage.value ? 'step' : undefined}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                enquiry.status === stage.value
                  ? 'bg-gold-500 text-charcoal-950'
                  : 'border border-cream-300 text-muted hover:border-gold-500 disabled:opacity-50'
              }`}
            >
              {stage.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <dl className="mb-5 space-y-3 text-sm">
              <Row
                label="Owner"
                value={
                  canAssignOthers ? (
                    <select
                      value={enquiry.assignee?._id ?? ''}
                      disabled={busy}
                      onChange={(e) => onAssign(e.target.value || null)}
                      className="h-8 rounded-lg border border-cream-300 bg-white px-2 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {staff.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : enquiry.assignee ? (
                    <span>
                      {enquiry.assignee.name}
                      {mine ? (
                        <button
                          type="button"
                          onClick={() => onAssign(null)}
                          disabled={busy}
                          className="ml-2 text-xs text-leaf-700 underline"
                        >
                          Release
                        </button>
                      ) : null}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAssign(undefined)}
                      disabled={busy}
                      className="rounded-full border border-cream-300 px-3 py-1 text-xs transition-colors hover:border-gold-500"
                    >
                      Claim this enquiry
                    </button>
                  )
                }
              />
              {enquiry.type === 'booking' ? (
                <>
                  <Row label="Tour" value={enquiry.tourTitle ?? '–'} />
                  {enquiry.travelDate ? (
                    <Row label="Travel date" value={formatDate(enquiry.travelDate)} />
                  ) : null}
                  <Row
                    label="Guests"
                    value={`${enquiry.guests?.adults ?? 0} adults, ${
                      enquiry.guests?.children ?? 0
                    } children, ${enquiry.guests?.infants ?? 0} infants`}
                  />
                </>
              ) : (
                <>
                  {enquiry.interest ? (
                    <Row label="Interest" value={enquiry.interest} />
                  ) : null}
                  {enquiry.budget ? (
                    <Row label="Budget" value={formatPrice(enquiry.budget, enquiry.budgetCurrency ?? 'KES')} />
                  ) : null}
                </>
              )}
              <Row label="Received" value={formatDate(enquiry.createdAt)} />
              {enquiry.lastContactedAt ? (
                <Row label="Last contact" value={formatDate(enquiry.lastContactedAt)} />
              ) : null}
              {enquiry.followUpAt ? (
                <Row
                  label="Follow up"
                  value={
                    <span className={enquiry.isOverdue ? 'text-maroon-700' : undefined}>
                      {formatDate(enquiry.followUpAt)}
                      {enquiry.isOverdue ? ' · overdue' : ''}
                    </span>
                  }
                />
              ) : null}
            </dl>

            {enquiry.message ? (
              <div className="mb-5 rounded-lg bg-cream-50 p-4">
                <p className="mb-1 text-xs uppercase tracking-wider text-muted">Message</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{enquiry.message}</p>
              </div>
            ) : null}

            {/* Logging contact is the action most likely to be forgotten and
                the one the overdue queue depends on, so it gets its own form
                rather than living behind the notes box. */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onContact(contactNote.trim(), followUp || null);
                setContactNote('');
              }}
              className="rounded-lg border border-cream-200 p-3"
            >
              <p className="mb-2 text-xs uppercase tracking-wider text-muted">Log contact</p>
              <textarea
                value={contactNote}
                onChange={(e) => setContactNote(e.target.value)}
                rows={2}
                placeholder="What did you discuss? (optional)"
                className="mb-2 w-full rounded-lg border border-cream-300 p-2 text-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted">
                  Follow up
                  <input
                    type="date"
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                    className="ml-1.5 rounded-lg border border-cream-300 px-2 py-1 text-xs"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="ml-auto rounded-full bg-gold-500 px-4 py-1.5 text-xs text-charcoal-950 hover:bg-gold-400 disabled:opacity-50"
                >
                  Log contact
                </button>
              </div>
            </form>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-muted">Activity</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!note.trim()) return;
                onNote(note.trim());
                setNote('');
              }}
              className="mb-4"
            >
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Add an internal note…"
                className="mb-2 w-full rounded-lg border border-cream-300 p-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy || !note.trim()}
                className="rounded-full border border-cream-300 px-4 py-1.5 text-xs transition-colors hover:border-gold-500 disabled:opacity-50"
              >
                Add note
              </button>
            </form>

            <div className="max-h-96 overflow-y-auto pr-1">
              <EnquiryTimeline events={enquiry.events ?? []} />
            </div>
          </div>
        </div>

        <div className="mt-5 flex border-t border-cream-200 pt-4">
          <button type="button" onClick={onDelete} className="ml-auto text-xs text-maroon-600 underline">
            Delete enquiry
          </button>
        </div>
      </>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

/** useSearchParams needs a Suspense boundary during prerender. */
export default function AdminEnquiriesPage() {
  return (
    <Suspense>
      <AdminEnquiriesView />
    </Suspense>
  );
}
