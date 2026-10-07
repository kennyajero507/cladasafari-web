import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  tone?: 'dark' | 'light';
  action?: ReactNode;
}

/**
 * Defaults to left alignment: a small-caps eyebrow above a display heading,
 * with any action sitting on the same baseline at the right.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  tone = 'dark',
  action,
}: SectionHeadingProps) {
  const centered = align === 'center';

  return (
    <div
      className={`mb-7 flex flex-col gap-4 md:mb-10 ${
        centered
          ? 'items-center text-center'
          : 'items-start md:flex-row md:items-end md:justify-between'
      }`}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className={`eyebrow mb-3 ${tone === 'light' ? 'text-gold-400' : 'text-gold-700'}`}>
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={`text-[1.7rem] leading-[1.2] sm:text-3xl md:text-[2.6rem] md:leading-[1.15] ${
            tone === 'light' ? 'text-cream-50' : 'text-charcoal-900'
          }`}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={`mt-4 text-base leading-relaxed ${
              tone === 'light' ? 'text-cream-200/75' : 'text-muted'
            }`}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
