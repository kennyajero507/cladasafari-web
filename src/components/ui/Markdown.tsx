import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * The small Markdown subset that blog posts and editable pages are written in:
 *
 *   ## Heading   ### Subheading   - bullet   1. numbered   **bold**   *italic*   [text](/path)
 *
 * Rendered by hand rather than through a Markdown pipeline, and never as raw
 * HTML, so whatever is pasted into the dashboard cannot inject markup or script.
 * Links are kept only when they are site paths or http(s)/mailto/tel.
 */
export function Markdown({ content, tone = 'light' }: { content: string; tone?: 'light' | 'dark' }) {
  const text = tone === 'dark' ? 'text-[#b8b2a0]' : 'text-muted';
  const blocks = content.trim().split(/\n{2,}/).filter(Boolean);

  return (
    <>
      {blocks.map((block, i) => {
        const trimmed = block.trim();

        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={i} className="mb-3 mt-8 text-xl">
              {renderInline(trimmed.slice(4))}
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={i} className="mb-4 mt-10 text-2xl first:mt-0">
              {renderInline(trimmed.slice(3))}
            </h2>
          );
        }

        const lines = trimmed.split('\n').map((l) => l.trim());
        if (lines.every((l) => /^\d+[.)] /.test(l))) {
          return (
            <ol key={i} className={`my-5 list-decimal space-y-2.5 pl-6 text-base leading-relaxed ${text}`}>
              {lines.map((line, j) => (
                <li key={j}>{renderInline(line.replace(/^\d+[.)] /, ''))}</li>
              ))}
            </ol>
          );
        }
        if (/^[-*] /m.test(trimmed)) {
          const points = lines.filter((l) => /^[-*] /.test(l));
          return (
            <ul key={i} className="my-5 space-y-2.5">
              {points.map((point, j) => (
                <li key={j} className={`flex items-start gap-3 text-base leading-relaxed ${text}`}>
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                  <span>{renderInline(point.replace(/^[-*] /, ''))}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className={`my-5 text-base leading-relaxed first:mt-0 ${text}`}>
            {renderInline(lines.join(' '))}
          </p>
        );
      })}
    </>
  );
}

const SAFE_HREF = /^(\/(?!\/)|https?:\/\/|mailto:|tel:)/;

export function renderInline(text: string): ReactNode[] {
  return text.split(/(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      if (!SAFE_HREF.test(href)) return label;
      const className = 'font-medium text-leaf-700 underline underline-offset-2 hover:text-gold-600';
      return href.startsWith('/') ? (
        <Link key={i} href={href} className={className}>
          {label}
        </Link>
      ) : (
        <a key={i} href={href} className={className} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {label}
        </a>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
