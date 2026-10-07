'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { BlogForm } from '@/components/admin/BlogForm';
import { StatusPill } from '@/components/admin/StatusPill';
import type { BlogPost } from '@/types';

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .get<BlogPost>(`/api/admin/blog/${id}`)
      .then(setPost)
      .catch((err) =>
        setError(err instanceof AdminApiError ? err.message : 'Could not load this post.')
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-cream-200" />
        {[0, 1].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-card bg-white" />
        ))}
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-xl rounded-card border border-cream-200 bg-white p-8 text-center">
        <h1 className="mb-3 text-xl">Post not found</h1>
        <p className="mb-6 text-sm text-muted">{error || 'This post may have been deleted.'}</p>
        <Link href="/admin/blog" className="text-sm text-leaf-700 underline">
          Back to posts
        </Link>
      </div>
    );
  }

  return (
    <div>
      <nav className="mb-5 text-sm">
        <Link href="/admin/blog" className="text-muted hover:underline">
          ← Back to posts
        </Link>
      </nav>

      <header className="mb-7 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{post.title}</h1>
        <StatusPill status={post.status} />
        {post.status === 'published' ? (
          <Link href={`/blog/${post.slug}`} target="_blank" className="text-sm text-leaf-700 underline">
            View live ↗
          </Link>
        ) : null}
      </header>

      <BlogForm post={post} />
    </div>
  );
}
