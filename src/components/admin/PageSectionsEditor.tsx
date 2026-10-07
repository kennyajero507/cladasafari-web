'use client';

import { TextArea, TextField, SelectField } from './FormControls';
import { ImageUploader } from './ImageUploader';
import type { CardItem, PageSection, PageSectionType } from '@/types';

export const SECTION_TYPES: { type: PageSectionType; label: string; hint: string }[] = [
  { type: 'text', label: 'Text', hint: 'A heading and body text.' },
  { type: 'imageText', label: 'Text with photos', hint: 'Text beside one or two photographs.' },
  { type: 'cards', label: 'Cards', hint: 'A grid of short cards, each with an optional link.' },
  { type: 'faq', label: 'FAQs', hint: 'The published FAQs, all or one group.' },
  { type: 'cta', label: 'Call to action', hint: 'A heading and one button.' },
];

const newId = () => `s-${Math.random().toString(36).slice(2, 9)}`;

export function blankSection(type: PageSectionType): PageSection {
  const id = newId();
  switch (type) {
    case 'text':
      return { id, type, eyebrow: '', heading: '', body: '' };
    case 'imageText':
      return { id, type, eyebrow: '', heading: '', body: '', images: [], imageSide: 'right' };
    case 'cards':
      return { id, type, eyebrow: '', heading: '', tone: 'light', items: [{ title: '', body: '', href: '', linkLabel: '' }] };
    case 'faq':
      return { id, type, eyebrow: 'FAQ', heading: 'Before you book', group: '' };
    case 'cta':
      return { id, type, eyebrow: '', heading: '', body: '', ctaLabel: '', ctaHref: '/contact', tone: 'dark' };
  }
}

/** Gives older blocks without an id a stable key for this editing session. */
export function withIds(sections: PageSection[]): PageSection[] {
  return sections.map((s) => (s.id ? s : { ...s, id: newId() }));
}

const small = 'rounded-full border border-cream-300 px-3 py-1 text-xs transition-colors hover:border-charcoal-900 disabled:opacity-40';

/**
 * The page's blocks, laid out after its body in this order. Errors arrive
 * from the API keyed as `sections.<index>.<field>`, and each input is named
 * the same way so the form's error summary can jump to it.
 */
export function PageSectionsEditor({
  value,
  onChange,
  errors,
}: {
  value: PageSection[];
  onChange: (next: PageSection[]) => void;
  errors: Record<string, string>;
}) {
  const update = (index: number, next: PageSection) => onChange(value.map((s, i) => (i === index ? next : s)));
  const move = (index: number, by: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-cream-300 p-5 text-center text-sm text-muted">
          No sections yet. The page shows its banner and body only.
        </p>
      ) : null}

      {value.map((section, i) => {
        const meta = SECTION_TYPES.find((t) => t.type === section.type);
        const err = (field: string) => errors[`sections.${i}.${field}`];
        const name = (field: string) => `sections.${i}.${field}`;

        return (
          <fieldset key={section.id} className="rounded-lg border border-cream-200 bg-cream-50/60 p-4">
            <legend className="sr-only">
              Section {i + 1}: {meta?.label}
            </legend>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                <span className="mr-2 text-muted">{i + 1}.</span>
                {meta?.label ?? section.type}
              </p>
              <div className="flex gap-1.5">
                <button type="button" className={small} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move section ${i + 1} up`}>
                  ↑
                </button>
                <button type="button" className={small} disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label={`Move section ${i + 1} down`}>
                  ↓
                </button>
                <button
                  type="button"
                  className={`${small} text-maroon-700 hover:border-maroon-600`}
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              </div>
            </div>
            {err('type') ? <p className="mb-3 text-xs text-maroon-600">{err('type')}</p> : null}

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Eyebrow" name={name('eyebrow')} value={section.eyebrow ?? ''} maxLength={80}
                  onChange={(v) => update(i, { ...section, eyebrow: v })} error={err('eyebrow')} />
                <TextField label={section.type === 'cta' ? 'Heading *' : 'Heading'} name={name('heading')} value={section.heading ?? ''}
                  maxLength={160} onChange={(v) => update(i, { ...section, heading: v })} error={err('heading')} />
              </div>

              {section.type === 'text' || section.type === 'imageText' ? (
                <TextArea label={section.type === 'text' ? 'Text *' : 'Text'} name={name('body')} rows={6} value={section.body}
                  onChange={(v) => update(i, { ...section, body: v })} error={err('body')} hint={MARKDOWN_HINT} />
              ) : null}

              {section.type === 'imageText' ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[0, 1].map((n) => (
                      <ImageUploader
                        key={n}
                        label={n === 0 ? 'Photograph' : 'Second photograph (optional)'}
                        name={name(`images.${n}`)}
                        value={section.images[n]}
                        error={err(`images.${n}.alt`) || err(`images.${n}.url`)}
                        onChange={(img) => {
                          const images = [...section.images];
                          if (img) images[n] = img;
                          else images.splice(n, 1);
                          update(i, { ...section, images: images.filter(Boolean) });
                        }}
                      />
                    ))}
                  </div>
                  <SelectField label="Photos sit on the" name={name('imageSide')} value={section.imageSide}
                    onChange={(v) => update(i, { ...section, imageSide: v as 'left' | 'right' })}
                    options={[{ value: 'right', label: 'Right' }, { value: 'left', label: 'Left' }]} />
                </>
              ) : null}

              {section.type === 'cards' ? (
                <CardsEditor
                  items={section.items}
                  tone={section.tone}
                  onTone={(tone) => update(i, { ...section, tone })}
                  onChange={(items) => update(i, { ...section, items })}
                  err={err}
                  name={name}
                />
              ) : null}

              {section.type === 'faq' ? (
                <SelectField label="Which FAQs" name={name('group')} value={section.group}
                  onChange={(v) => update(i, { ...section, group: v as typeof section.group })}
                  options={[
                    { value: '', label: 'All published FAQs' },
                    { value: 'general', label: 'General' },
                    { value: 'booking', label: 'Booking' },
                    { value: 'travel', label: 'Travel' },
                    { value: 'payment', label: 'Payment' },
                  ]} />
              ) : null}

              {section.type === 'cta' ? (
                <>
                  <TextArea label="Text" name={name('body')} rows={2} maxLength={600} value={section.body ?? ''}
                    onChange={(v) => update(i, { ...section, body: v })} error={err('body')} />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <TextField label="Button label *" name={name('ctaLabel')} value={section.ctaLabel} maxLength={60}
                      onChange={(v) => update(i, { ...section, ctaLabel: v })} error={err('ctaLabel')} />
                    <TextField label="Button link *" name={name('ctaHref')} value={section.ctaHref} placeholder="/contact"
                      onChange={(v) => update(i, { ...section, ctaHref: v })} error={err('ctaHref')} />
                    <SelectField label="Background" name={name('tone')} value={section.tone}
                      onChange={(v) => update(i, { ...section, tone: v as 'light' | 'dark' })}
                      options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} />
                  </div>
                </>
              ) : null}
            </div>
          </fieldset>
        );
      })}

      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted">Add a section</p>
        <div className="flex flex-wrap gap-2">
          {SECTION_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              title={t.hint}
              onClick={() => onChange([...value, blankSection(t.type)])}
              disabled={value.length >= 20}
              className="rounded-full border border-cream-300 bg-white px-4 py-2 text-sm transition-colors hover:border-gold-500 disabled:opacity-40"
            >
              + {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CardsEditor({
  items,
  tone,
  onTone,
  onChange,
  err,
  name,
}: {
  items: CardItem[];
  tone: 'light' | 'dark';
  onTone: (tone: 'light' | 'dark') => void;
  onChange: (items: CardItem[]) => void;
  err: (field: string) => string | undefined;
  name: (field: string) => string;
}) {
  const set = (index: number, patch: Partial<CardItem>) => onChange(items.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-3">
      <SelectField label="Background" name={name('tone')} value={tone} onChange={(v) => onTone(v as 'light' | 'dark')}
        options={[{ value: 'light', label: 'Light (numbered cards)' }, { value: 'dark', label: 'Dark' }]} />
      {err('items') ? <p className="text-xs text-maroon-600">{err('items')}</p> : null}
      {items.map((card, c) => (
        <div key={c} className="rounded-lg border border-cream-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-muted">Card {c + 1}</p>
            <button type="button" className="text-xs text-maroon-700 hover:underline" onClick={() => onChange(items.filter((_, j) => j !== c))}>
              Remove card
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Title *" name={name(`items.${c}.title`)} value={card.title} maxLength={120}
              onChange={(v) => set(c, { title: v })} error={err(`items.${c}.title`)} />
            <TextField label="Small label" name={name(`items.${c}.eyebrow`)} value={card.eyebrow ?? ''} maxLength={80}
              onChange={(v) => set(c, { eyebrow: v })} />
          </div>
          <div className="mt-3">
            <TextArea label="Text" name={name(`items.${c}.body`)} rows={2} maxLength={600} value={card.body ?? ''}
              onChange={(v) => set(c, { body: v })} error={err(`items.${c}.body`)} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextField label="Link" name={name(`items.${c}.href`)} value={card.href ?? ''} placeholder="/tours?category=safaris"
              onChange={(v) => set(c, { href: v })} error={err(`items.${c}.href`)} />
            <TextField label="Link label" name={name(`items.${c}.linkLabel`)} value={card.linkLabel ?? ''} maxLength={40}
              placeholder="Find out more →" onChange={(v) => set(c, { linkLabel: v })} />
          </div>
        </div>
      ))}
      <button
        type="button"
        disabled={items.length >= 12}
        onClick={() => onChange([...items, { title: '', body: '', href: '', linkLabel: '' }])}
        className="rounded-full border border-cream-300 bg-white px-4 py-1.5 text-xs hover:border-gold-500 disabled:opacity-40"
      >
        + Add card
      </button>
    </div>
  );
}

export const MARKDOWN_HINT =
  'Blank line between paragraphs. ## Heading, ### Subheading, - bullet, 1. numbered, **bold**, *italic*, [link text](/contact).';
