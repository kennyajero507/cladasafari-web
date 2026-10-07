'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { useUnsavedChangesGuard } from '@/lib/useUnsavedChanges';
import {
  TextField,
  TextArea,
  SelectField,
  CheckboxField,
  ListField,
  FormSection,
  FormActions,
} from './FormControls';
import { ImageUploader } from './ImageUploader';
import { FormError } from './FormError';
import { useConfirm } from './ConfirmDialog';
import { useToast } from './Toasts';
import type { BlogPost, ApiImage } from '@/types';

export function BlogForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? '');
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [coverImage, setCoverImage] = useState<ApiImage | undefined>(post?.coverImage);
  const [authorName, setAuthorName] = useState(post?.author?.name ?? 'Clada Safari Bliss');
  const [tags, setTags] = useState<string[]>(post?.tags ?? []);
  const [readingMinutes, setReadingMinutes] = useState(String(post?.readingMinutes ?? ''));
  const [featured, setFeatured] = useState(post?.featured ?? false);
  const [status, setStatus] = useState(post?.status ?? 'draft');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [confirm, confirmDialog] = useConfirm();
  const { toast } = useToast();

  const snapshot = JSON.stringify({
    title,
    excerpt,
    content,
    coverImage,
    authorName,
    tags,
    readingMinutes,
    featured,
    status,
  });
  const initial = useRef(snapshot);
  const dirty = snapshot !== initial.current;
  useUnsavedChangesGuard(dirty && !saving && !deleting);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!coverImage?.url || !coverImage.alt) {
      setError('A cover image with alt text is required.');
      setFieldErrors({ coverImage: 'Upload an image and describe it.' });
      return;
    }

    setSaving(true);
    setError('');
    setFieldErrors({});

    const body: Record<string, unknown> = {
      title,
      excerpt,
      content,
      coverImage,
      author: { name: authorName },
      tags,
      featured,
      status,
    };
    if (readingMinutes) body.readingMinutes = Number(readingMinutes);

    try {
      if (post) {
        await adminApi.patch(`/api/admin/blog/${post._id}`, body);
        initial.current = snapshot;
        toast({
          message:
            status === 'published'
              ? 'Saved. The post is live in the Journal.'
              : 'Saved as a draft.',
        });
        router.refresh();
      } else {
        const created = await adminApi.post<BlogPost>('/api/admin/blog', body);
        toast({ message: `"${title}" created.` });
        router.push(`/admin/blog/${created._id}`);
        router.refresh();
      }
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
        if (err.details) setFieldErrors(err.details);
      } else {
        setError('Could not save the post.');
      }
      toast({ tone: 'error', message: 'The post could not be saved.' });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!post) return;

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

    setDeleting(true);
    try {
      await adminApi.remove(`/api/admin/blog/${post._id}`);
      toast({ message: `"${post.title}" was deleted.` });
      router.push('/admin/blog');
      router.refresh();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not delete the post.';
      setError(message);
      toast({ tone: 'error', message });
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 pb-4">
      <FormError message={error} fieldErrors={fieldErrors} />

      <FormSection title="Article">
        <TextField label="Title" name="title" value={title} onChange={setTitle} required />
        <TextArea
          label="Excerpt"
          name="excerpt"
          value={excerpt}
          onChange={setExcerpt}
          rows={2}
          required
          hint="Shown on cards and as the intro line. Maximum 300 characters."
        />
        <TextArea
          label="Content"
          name="content"
          value={content}
          onChange={setContent}
          rows={18}
          required
          hint="Supports a small Markdown subset: ## headings, **bold**, *italic* and - bullet lists."
        />
      </FormSection>

      <FormSection title="Cover image">
        <ImageUploader label="Cover" value={coverImage} onChange={setCoverImage} required />
      </FormSection>

      <FormSection title="Metadata">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Author" name="author" value={authorName} onChange={setAuthorName} />
          <TextField
            label="Reading time (minutes)"
            name="readingMinutes"
            type="number"
            value={readingMinutes}
            onChange={setReadingMinutes}
            hint="Leave blank to estimate from the content."
          />
        </div>
        <ListField label="Tags" value={tags} onChange={setTags} rows={3} />
      </FormSection>

      <FormSection title="Visibility">
        <SelectField
          label="Status"
          name="status"
          value={status}
          onChange={(v) => setStatus(v as BlogPost['status'])}
          options={[
            { value: 'draft', label: 'Draft: hidden from the Journal' },
            { value: 'published', label: 'Published: live' },
          ]}
        />
        <CheckboxField label="Featured" checked={featured} onChange={setFeatured} />
      </FormSection>

      <FormActions
        dirty={dirty}
        saving={saving}
        onDelete={post ? onDelete : undefined}
        deleting={deleting}
        submitLabel={post ? 'Save changes' : 'Create post'}
      />

      {confirmDialog}
    </form>
  );
}
