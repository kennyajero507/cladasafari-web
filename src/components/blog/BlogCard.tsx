import Image from 'next/image';
import Link from 'next/link';
import type { BlogPost } from '@/types';
import { formatDate } from '@/lib/format';

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card transition-all duration-500 ease-soft hover:-translate-y-1.5 hover:shadow-card-hover">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/10] overflow-hidden">
        <Image
          src={post.coverImage.url}
          alt={post.coverImage.alt}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 ease-soft group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <p className="mb-3 flex items-center gap-2 text-xs text-muted">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          <span aria-hidden>·</span>
          <span>{post.readingMinutes} min read</span>
        </p>

        <h3 className="mb-3 text-lg leading-snug">
          <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-leaf-500">
            {post.title}
          </Link>
        </h3>

        <p className="mb-5 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">{post.excerpt}</p>

        <Link
          href={`/blog/${post.slug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-leaf-700 transition-colors hover:text-gold-600"
        >
          Read more
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}
