import Link from 'next/link';
import { BlogForm } from '@/components/admin/BlogForm';

export default function NewBlogPostPage() {
  return (
    <div>
      <nav className="mb-5 text-sm">
        <Link href="/admin/blog" className="text-muted hover:underline">
          ← Back to posts
        </Link>
      </nav>
      <h1 className="mb-7 text-3xl">New blog post</h1>
      <BlogForm />
    </div>
  );
}
