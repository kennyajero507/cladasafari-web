'use client';

import { useRef, useState } from 'react';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { ImageUploader } from './ImageUploader';
import type { ApiImage } from '@/types';

/**
 * Gallery images for a tour or destination.
 *
 * The old version rendered a plain list of uploaders keyed by array index, so
 * removing the second image shuffled every later image's state onto its
 * neighbour, and adding several photos meant repeating a one-at-a-time flow.
 * Entries now carry a stable key, several files can be chosen at once, and
 * images can be reordered.
 */

let nextKey = 1;
const makeKey = () => `g${nextKey++}`;

export function GalleryEditor({
  value,
  onChange,
}: {
  value: ApiImage[];
  onChange: (next: ApiImage[]) => void;
}) {
  /**
   * One key per slot, held in state and reordered alongside the images.
   *
   * Keying by array index meant removing the second image shuffled every later
   * image's component state onto its neighbour: the third image's alt text
   * would appear under the fourth. Keys move with their image instead.
   */
  const [keys, setKeys] = useState<string[]>(() => value.map(makeKey));

  // If the parent replaces the array wholesale (a record finishing loading),
  // top up or trim so there is exactly one key per image.
  if (keys.length !== value.length) {
    setKeys((current) => {
      if (current.length === value.length) return current;
      if (current.length > value.length) return current.slice(0, value.length);
      return [...current, ...Array.from({ length: value.length - current.length }, makeKey)];
    });
  }

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const multiRef = useRef<HTMLInputElement>(null);

  function replaceAt(index: number, image: ApiImage | undefined) {
    if (!image) {
      setKeys((k) => k.filter((_, i) => i !== index));
      onChange(value.filter((_, i) => i !== index));
      return;
    }
    onChange(value.map((g, i) => (i === index ? image : g)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;

    const images = [...value];
    [images[index], images[target]] = [images[target], images[index]];
    setKeys((k) => {
      const next = [...k];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    onChange(images);
  }

  /** Uploads every chosen file, appending each as it lands. */
  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setError('');
    const added: ApiImage[] = [];

    for (const file of files) {
      try {
        const { url } = await adminApi.upload(file);
        added.push({ url, alt: '' });
      } catch (err) {
        setError(
          err instanceof AdminApiError
            ? `${file.name}: ${err.message}`
            : `${file.name} could not be uploaded.`
        );
      }
    }

    if (added.length > 0) {
      setKeys((k) => [...k, ...added.map(makeKey)]);
      onChange([...value, ...added]);
    }

    setUploading(false);
    if (multiRef.current) multiRef.current.value = '';
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">Gallery</p>
        {value.length > 0 ? (
          <p className="text-xs text-muted">
            {value.length} {value.length === 1 ? 'image' : 'images'} · first is shown first
          </p>
        ) : null}
      </div>

      {value.map((image, i) => (
        <div key={keys[i] ?? i} className="relative">
          <ImageUploader
            label={`Gallery image ${i + 1}`}
            value={image}
            onChange={(v) => replaceAt(i, v)}
          />
          {value.length > 1 ? (
            <div className="absolute right-3 top-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Move gallery image ${i + 1} earlier`}
                className="h-7 w-7 rounded border border-cream-300 bg-white text-xs disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === value.length - 1}
                aria-label={`Move gallery image ${i + 1} later`}
                className="h-7 w-7 rounded border border-cream-300 bg-white text-xs disabled:opacity-40"
              >
                ↓
              </button>
            </div>
          ) : null}
        </div>
      ))}

      {error ? <p className="text-xs text-maroon-600">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <label className="flex-1 cursor-pointer rounded-lg border border-dashed border-cream-300 py-2.5 text-center text-sm text-leaf-700 transition-colors hover:border-gold-500">
          {uploading ? 'Uploading…' : '+ Upload images'}
          <input
            ref={multiRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            onChange={onFiles}
            disabled={uploading}
            className="sr-only"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setKeys((k) => [...k, makeKey()]);
            onChange([...value, { url: '', alt: '' }]);
          }}
          className="rounded-lg border border-dashed border-cream-300 px-4 py-2.5 text-sm text-leaf-700 transition-colors hover:border-gold-500"
        >
          + Add empty slot
        </button>
      </div>

      <p className="text-xs text-muted">
        Images without alt text are dropped when the tour is saved.
      </p>
    </div>
  );
}
