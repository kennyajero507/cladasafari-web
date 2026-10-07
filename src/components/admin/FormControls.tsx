'use client';

import { useState, type ReactNode } from 'react';

const inputBase =
  'w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none disabled:bg-cream-50';

export function TextField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
  error,
  hint,
  maxLength,
}: {
  label: string;
  name: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-ink">
        {label} {required ? <span className="text-muted">*</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className={`${inputBase} ${error ? 'border-maroon-600' : 'border-cream-300 focus:border-gold-500'}`}
      />
      {hint && !error ? (
        <p id={`${name}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-xs text-maroon-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextArea({
  label,
  name,
  value,
  onChange,
  rows = 4,
  required = false,
  placeholder,
  error,
  hint,
  maxLength,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  error?: string;
  hint?: string;
  maxLength?: number;
}) {
  // Warn as the cap approaches rather than only cutting the paste off silently.
  const remaining = maxLength === undefined ? null : maxLength - value.length;

  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-ink">
        {label} {required ? <span className="text-muted">*</span> : null}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        value={value}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className={`${inputBase} ${error ? 'border-maroon-600' : 'border-cream-300 focus:border-gold-500'}`}
      />
      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {hint && !error ? (
            <p id={`${name}-hint`} className="text-xs text-muted">
              {hint}
            </p>
          ) : null}
          {error ? (
            <p id={`${name}-error`} className="text-xs text-maroon-600">
              {error}
            </p>
          ) : null}
        </div>
        {remaining !== null && remaining <= Math.max(40, (maxLength ?? 0) * 0.15) ? (
          <p className={`shrink-0 text-xs ${remaining === 0 ? 'text-maroon-600' : 'text-muted'}`}>
            {remaining} left
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-ink">
        {label} {required ? <span className="text-muted">*</span> : null}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputBase} border-cream-300 bg-white focus:border-gold-500`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-gold-500"
      />
      <span>
        <span className="block text-sm text-ink">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/**
 * Edits a string[] as one item per line, simpler than a repeater for short
 * lists.
 *
 * The text is held locally while editing. Trimming and dropping blank lines on
 * every keystroke meant pressing Enter to start a new bullet deleted the empty
 * line as fast as it was typed, bouncing the cursor back. Lines are now only
 * cleaned on blur, which is also when the parent's array is rewritten.
 */
export function ListField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 5,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  // While focused the draft wins; otherwise mirror whatever the parent holds,
  // so an external reset (loading a record) still shows through.
  const text = draft ?? value.join('\n');

  function commit(next: string) {
    setDraft(null);
    const lines = next
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    // Avoid a pointless parent update when nothing actually changed.
    if (lines.length !== value.length || lines.some((line, i) => line !== value[i])) {
      onChange(lines);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <textarea
        rows={rows}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        className={`${inputBase} border-cream-300 focus:border-gold-500`}
      />
      <p className="mt-1 text-xs text-muted">{hint ?? 'One per line.'}</p>
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  children: ReactNode;
  /** Lets a grid parent span this section across columns. */
  className?: string;
}) {
  return (
    <section className={`rounded-card border border-cream-200 bg-white p-6 ${className}`}>
      <h2 className="text-lg">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function FormActions({
  saving,
  onDelete,
  deleting,
  submitLabel = 'Save',
  dirty,
}: {
  saving: boolean;
  onDelete?: () => void;
  deleting?: boolean;
  submitLabel?: string;
  /** Shows an unsaved-changes marker next to the button. */
  dirty?: boolean;
}) {
  return (
    <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-cream-200 bg-cream-100/95 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="h-11 rounded-full bg-gold-500 px-8 text-sm font-medium text-charcoal-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        {/* The guard already blocks navigation; this says so before the admin
            tries to leave. */}
        {dirty && !saving ? (
          <span className="text-xs text-muted">Unsaved changes</span>
        ) : null}
      </div>

      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="text-sm text-maroon-600 underline transition-colors hover:text-maroon-700 disabled:opacity-60"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      ) : null}
    </div>
  );
}
