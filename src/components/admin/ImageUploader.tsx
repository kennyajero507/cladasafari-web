'use client';

import { useId, useRef, useState } from 'react';
import Image from 'next/image';
import { adminApi, AdminApiError } from '@/lib/adminApi';

interface ImageValue {
  url: string;
  alt: string;
  caption?: string;
}

/** Mirrors the multer config in api/src/routes/uploads.js. */
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const MAX_BYTES = 6 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}

/**
 * Accepts a dropped or chosen file, or a path already in the repo (/images/…).
 * Alt text is required: it is what screen readers announce and what appears if
 * an image fails to load.
 *
 * The drop zone is the primary affordance: this used to lead with a raw URL
 * text input, which is not how anyone uploads a photo. The URL field is still
 * available, just no longer the first thing offered.
 */
export function ImageUploader({
  label,
  value,
  onChange,
  required = false,
  name,
  error: externalError,
}: {
  label: string;
  value?: ImageValue;
  onChange: (next: ImageValue | undefined) => void;
  required?: boolean;
  /** Lets a form error summary focus this control. */
  name?: string;
  error?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  // Files this component uploaded in this session. Only these are safe to
  // delete from disk: a URL typed by hand may be shared by other documents.
  const [ownUploads, setOwnUploads] = useState<string[]>([]);

  /** Best-effort cleanup so replaced images do not accumulate on disk. */
  function discardUpload(url?: string) {
    if (!url || !ownUploads.includes(url)) return;
    const filename = url.split('/').pop();
    if (!filename) return;
    adminApi.remove(`/api/admin/uploads/${filename}`).catch(() => {
      // A leftover file is not worth interrupting the edit for.
    });
    setOwnUploads((list) => list.filter((u) => u !== url));
  }

  async function upload(file: File) {
    // Checked here so a 12MB photo fails in a tenth of a second with a clear
    // reason, rather than after a long upload and a generic server error.
    if (!ACCEPT.split(',').includes(file.type)) {
      setError('That file type is not supported. Use JPEG, PNG, WebP or AVIF.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(
        `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_BYTES)}. Try exporting it smaller.`
      );
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);

    // The fetch-based client cannot report progress, so this is a paced
    // indeterminate bar: honest about activity, and it never claims 100%
    // before the request actually resolves.
    const tick = setInterval(() => setProgress((p) => Math.min(p + 7, 90)), 120);

    const replaced = value?.url;
    try {
      const { url } = await adminApi.upload(file);
      setProgress(100);
      onChange({ url, alt: value?.alt ?? '', caption: value?.caption });
      setOwnUploads((list) => [...list, url]);
      discardUpload(replaced);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Upload failed.');
    } finally {
      clearInterval(tick);
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await upload(file);
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await upload(file);
  }

  const shownError = error || externalError;

  return (
    <fieldset className="rounded-lg border border-cream-200 p-4">
      <legend className="px-2 text-sm font-medium text-ink">
        {label} {required ? <span className="text-muted">*</span> : null}
      </legend>

      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Drop zone doubles as the preview once an image is set. */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`relative h-32 w-full shrink-0 overflow-hidden rounded-lg border-2 border-dashed transition-colors sm:w-44 ${
            dragging ? 'border-gold-500 bg-gold-50' : 'border-cream-300 bg-cream-50'
          }`}
        >
          {value?.url ? (
            <Image
              src={value.url}
              alt={value.alt || ''}
              fill
              sizes="176px"
              className="object-cover"
            />
          ) : null}

          {/* The whole zone is a label for the file input, so click and
              keyboard activation both open the picker. */}
          <label
            htmlFor={inputId}
            className={`absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-1 px-2 text-center text-xs transition-colors ${
              value?.url
                ? 'bg-black/0 text-transparent hover:bg-black/55 hover:text-white'
                : 'text-muted hover:text-charcoal-800'
            }`}
          >
            <span aria-hidden="true" className="text-lg">
              ⬆
            </span>
            <span>{value?.url ? 'Replace image' : 'Drop an image or browse'}</span>
          </label>

          <input
            ref={fileRef}
            id={inputId}
            name={name}
            type="file"
            accept={ACCEPT}
            onChange={onFile}
            disabled={uploading}
            className="sr-only"
          />

          {uploading ? (
            <div className="absolute inset-x-0 bottom-0 bg-charcoal-950/80 p-2">
              <div
                role="progressbar"
                aria-label="Uploading image"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 w-full overflow-hidden rounded-full bg-white/20"
              >
                <div
                  className="h-full rounded-full bg-gold-500 transition-[width] duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-center text-[0.625rem] text-cream-100">Uploading…</p>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <label htmlFor={`${inputId}-alt`} className="mb-1 block text-xs text-muted">
              Alt text {required ? '*' : null}
            </label>
            {/* Spread the existing value so editing one field never drops the
                others, notably caption, which has no input of its own here. */}
            <input
              id={`${inputId}-alt`}
              type="text"
              value={value?.alt ?? ''}
              onChange={(e) => onChange({ ...value, url: value?.url ?? '', alt: e.target.value })}
              placeholder="Describe the image for screen readers"
              className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
            />
          </div>

          {showUrl || (value?.url && !ownUploads.includes(value.url)) ? (
            <div>
              <label htmlFor={`${inputId}-url`} className="mb-1 block text-xs text-muted">
                Image path
              </label>
              <input
                id={`${inputId}-url`}
                type="text"
                value={value?.url ?? ''}
                onChange={(e) => onChange({ ...value, alt: value?.alt ?? '', url: e.target.value })}
                placeholder="/images/mara-lions-stalking.jpg"
                className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowUrl(true)}
              className="text-xs text-muted underline hover:text-charcoal-800"
            >
              or paste a path
            </button>
          )}

          <div className="flex items-center gap-3">
            <p className="text-xs text-muted">
              JPEG, PNG, WebP or AVIF · up to {formatBytes(MAX_BYTES)}
            </p>
            {value?.url ? (
              <button
                type="button"
                onClick={() => {
                  discardUpload(value?.url);
                  onChange(undefined);
                }}
                className="ml-auto text-xs text-muted underline hover:text-maroon-600"
              >
                Clear
              </button>
            ) : null}
          </div>

          {shownError ? <p className="text-xs text-maroon-600">{shownError}</p> : null}
        </div>
      </div>
    </fieldset>
  );
}
