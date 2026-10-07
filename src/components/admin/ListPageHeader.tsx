import Link from 'next/link';

export function ListPageHeader({
  title,
  description,
  newHref,
  newLabel,
}: {
  title: string;
  description?: string;
  newHref?: string;
  newLabel?: string;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
      </div>
      {newHref ? (
        <Link
          href={newHref}
          className="h-11 rounded-full bg-gold-500 px-6 text-sm font-medium leading-[2.75rem] text-charcoal-950 transition-colors hover:bg-gold-400"
        >
          {newLabel ?? 'Add new'}
        </Link>
      ) : null}
    </header>
  );
}
