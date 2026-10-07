'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { useListParams } from '@/lib/useListParams';
import { ListPageHeader } from '@/components/admin/ListPageHeader';
import { ListToolbar } from '@/components/admin/ListToolbar';
import { Pagination } from '@/components/admin/Pagination';
import { Modal } from '@/components/admin/Modal';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toasts';
import type { MediaAsset, PageMeta } from '@/types';

const SOURCES = [
  { value: '', label: 'All' },
  { value: 'original', label: 'Original site' },
  { value: 'pexels', label: 'Pexels' },
  { value: 'upload', label: 'Uploaded' },
];

const SORTS = [
  { value: 'title-asc', label: 'Name' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

const input =
  'w-full rounded-lg border border-cream-300 px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none';

/**
 * Every image the site can show, with its alt text, credit and origin. Alt text
 * edited here applies wherever the image is used.
 */
function MediaLibraryView() {
  const { params, setParams } = useListParams({ page: '1', q: '', sort: 'title-asc', source: '' });
  const page = Number(params.page) || 1;
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, confirmDialog] = useConfirm();
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: '48', page: String(page), sort: params.sort });
      if (params.q) query.set('q', params.q);
      if (params.source) query.set('source', params.source);
      const { items, meta: pageMeta } = await adminApi.list<MediaAsset>(`/api/admin/media?${query}`);
      setAssets(items);
      setMeta(pageMeta);
      setError('');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load the media library.');
    } finally {
      setLoading(false);
    }
  }, [page, params.q, params.sort, params.source]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(file: File) {
    setUploading(true);
    try {
      await adminApi.upload(file);
      toast({ message: 'Image uploaded. Add its alt text and credit.' });
      setParams({ source: 'upload', sort: 'newest', page: '1' });
      await load();
    } catch (err) {
      toast({ tone: 'error', message: err instanceof AdminApiError ? err.message : 'Upload failed.' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await adminApi.patch(`/api/admin/media/${editing.id}`, {
        alt: editing.alt,
        caption: editing.caption,
        title: editing.title,
        photographer: editing.photographer,
        sourceUrl: editing.sourceUrl,
        license: editing.license,
        notes: editing.notes,
      });
      toast({ message: 'Image details saved.' });
      setEditing(null);
      await load();
    } catch (err) {
      toast({ tone: 'error', message: err instanceof AdminApiError ? err.message : 'Could not save.' });
    } finally {
      setSaving(false);
    }
  }

  async function remove(asset: MediaAsset) {
    const ok = await confirm({
      title: 'Delete this image?',
      body: 'Images still used by a package, destination or page cannot be deleted; replace them there first.',
      confirmLabel: 'Delete image',
    });
    if (!ok) return;
    try {
      await adminApi.remove(`/api/admin/media/${asset.id}`);
      toast({ message: 'Image deleted.' });
      setEditing(null);
      await load();
    } catch (err) {
      toast({ tone: 'error', message: err instanceof AdminApiError ? err.message : 'Could not delete.' });
    }
  }

  return (
    <div>
      <ListPageHeader
        title="Media library"
        description="Alt text, credits and origin for every image on the site. Credits appear on the public Photo credits page."
      />

      <div className="mb-5">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          id="media-upload"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <label
          htmlFor="media-upload"
          className={`inline-flex h-11 cursor-pointer items-center rounded-full bg-gold-500 px-6 text-sm font-medium text-charcoal-950 transition-colors hover:bg-gold-400 ${
            uploading ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {uploading ? 'Uploading…' : 'Upload image'}
        </label>
      </div>

      <ListToolbar
        search={params.q}
        onSearchChange={(q) => setParams({ q, page: '1' }, { replace: true })}
        searchPlaceholder="Search alt text, names or photographers"
        sort={params.sort}
        sorts={SORTS}
        onSortChange={(sort) => setParams({ sort })}
        busy={loading}
        resultLabel={meta ? `${meta.total} ${meta.total === 1 ? 'image' : 'images'}` : undefined}
        filters={SOURCES.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setParams({ source: f.value, page: '1' })}
            aria-pressed={params.source === f.value}
            className={`h-9 rounded-full px-4 text-xs transition-colors ${
              params.source === f.value
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

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {assets.map((asset) => (
          <li key={asset.id}>
            <button
              type="button"
              onClick={() => setEditing(asset)}
              className="group block w-full overflow-hidden rounded-lg border border-cream-200 bg-white text-left transition-shadow hover:shadow-card"
            >
              <span className="relative block aspect-[4/3] bg-cream-100">
                <Image src={asset.url} alt="" fill sizes="200px" className="object-cover" unoptimized={asset.url.endsWith('.svg')} />
                <span className="absolute left-1.5 top-1.5 rounded bg-charcoal-950/75 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide text-cream-100">
                  {asset.source}
                </span>
              </span>
              <span className="block p-2.5 text-[0.72rem] leading-snug">
                <span className="line-clamp-2 text-ink">{asset.alt}</span>
                <span className="mt-1 block truncate text-muted">{asset.credit || asset.license || '—'}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Pagination meta={meta} onPageChange={(next) => setParams({ page: String(next) })} busy={loading} />

      {editing ? (
        <Modal as="form" onSubmit={save} label="Image details" onClose={() => setEditing(null)} className="max-w-2xl">
          <>
            <h2 className="mb-4 text-xl">Image details</h2>
            <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-lg bg-cream-100">
              <Image src={editing.url} alt={editing.alt} fill sizes="600px" className="object-contain" unoptimized={editing.url.endsWith('.svg')} />
            </div>
            <p className="mb-4 break-all text-xs text-muted">
              {editing.url}
              {editing.width ? ` · ${editing.width}×${editing.height}` : ''}
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="m-alt" className="mb-1.5 block text-sm font-medium">Alt text *</label>
                <input id="m-alt" required value={editing.alt} onChange={(e) => setEditing({ ...editing, alt: e.target.value })} className={input} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="m-photographer" className="mb-1.5 block text-sm font-medium">Photographer</label>
                  <input id="m-photographer" value={editing.photographer} onChange={(e) => setEditing({ ...editing, photographer: e.target.value })} className={input} />
                </div>
                <div>
                  <label htmlFor="m-license" className="mb-1.5 block text-sm font-medium">Licence</label>
                  <input id="m-license" value={editing.license} onChange={(e) => setEditing({ ...editing, license: e.target.value })} className={input} />
                </div>
              </div>
              <div>
                <label htmlFor="m-source" className="mb-1.5 block text-sm font-medium">Source link</label>
                <input id="m-source" type="url" value={editing.sourceUrl} onChange={(e) => setEditing({ ...editing, sourceUrl: e.target.value })} className={input} />
              </div>
              <div>
                <label htmlFor="m-caption" className="mb-1.5 block text-sm font-medium">Caption</label>
                <input id="m-caption" value={editing.caption} onChange={(e) => setEditing({ ...editing, caption: e.target.value })} className={input} />
              </div>
              <div>
                <label htmlFor="m-notes" className="mb-1.5 block text-sm font-medium">Internal notes</label>
                <textarea id="m-notes" rows={2} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} className={input} />
              </div>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="submit" disabled={saving} className="h-11 rounded-full bg-gold-500 px-8 text-sm font-medium text-charcoal-950 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="h-11 rounded-full border border-cream-300 px-6 text-sm">
                Cancel
              </button>
              <button type="button" onClick={() => remove(editing)} className="ml-auto h-11 px-4 text-sm text-maroon-600 underline">
                Delete image
              </button>
            </div>
          </>
        </Modal>
      ) : null}

      {confirmDialog}
    </div>
  );
}

export default function AdminMediaPage() {
  return (
    <Suspense>
      <MediaLibraryView />
    </Suspense>
  );
}
