/** Two side-by-side columns of plain ticked and crossed lines. */
export function InclusionLists({
  inclusions,
  exclusions,
}: {
  inclusions: string[];
  exclusions: string[];
}) {
  if (!inclusions?.length && !exclusions?.length) return null;

  return (
    <div className="grid gap-10 md:grid-cols-2">
      {inclusions?.length ? (
        <div>
          <p className="mb-2 text-[0.68rem] uppercase tracking-[0.2em] text-gold-600">Included</p>
          <h3 className="mb-5 font-display text-xl text-charcoal-900">What&rsquo;s included</h3>
          <ul className="space-y-2.5">
            {inclusions.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink">
                <span aria-hidden className="mt-0.5 shrink-0 text-leaf-500">
                  <CheckIcon />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {exclusions?.length ? (
        <div>
          <p className="mb-2 text-[0.68rem] uppercase tracking-[0.2em] text-gold-600">Excluded</p>
          <h3 className="mb-5 font-display text-xl text-charcoal-900">What&rsquo;s not included</h3>
          <ul className="space-y-2.5">
            {exclusions.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted">
                <span aria-hidden className="mt-0.5 shrink-0 text-maroon-600/70">
                  <CrossIcon />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
