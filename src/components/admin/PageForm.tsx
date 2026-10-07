'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { useUnsavedChangesGuard } from '@/lib/useUnsavedChanges';
import { Markdown } from '@/components/ui/Markdown';
import { SOCIAL_LABELS, type SocialKey } from '@/components/ui/SocialIcon';
import { TextField, TextArea, SelectField, CheckboxField, ListField, FormSection, FormActions } from './FormControls';
import { ImageUploader } from './ImageUploader';
import { FormError } from './FormError';
import { useConfirm } from './ConfirmDialog';
import { useToast } from './Toasts';
import { MARKDOWN_HINT, PageSectionsEditor, blankSection, withIds } from './PageSectionsEditor';
import type { ApiImage, CmsPage, PageContact, PageSection, PageTemplate } from '@/types';

const TEMPLATES: { value: PageTemplate; label: string; hint: string }[] = [
  { value: 'standard', label: 'Standard', hint: 'Banner, body text, then sections. About Us, FAQs, guides.' },
  { value: 'legal', label: 'Legal / policy', hint: 'A plain reading column with its last-updated date. Privacy Policy, Terms.' },
  { value: 'contact', label: 'Contact', hint: 'The enquiry form beside your emails, phones and offices.' },
];

const BLANK_CONTACT: PageContact = {
  emails: [],
  phones: [],
  offices: [],
  hours: '',
  socials: {},
  showForm: true,
  formHeading: '',
};

interface FormState {
  title: string;
  slug: string;
  template: PageTemplate;
  eyebrow: string;
  subtitle: string;
  heroImage?: ApiImage;
  body: string;
  sections: PageSection[];
  contact: PageContact;
  showInFooter: boolean;
  order: string;
  status: 'draft' | 'published';
  isSample: boolean;
  metaTitle: string;
  metaDescription: string;
}

function toFormState(page?: CmsPage): FormState {
  return {
    title: page?.title ?? '',
    slug: page?.slug ?? '',
    template: page?.template ?? 'standard',
    eyebrow: page?.eyebrow ?? '',
    subtitle: page?.subtitle ?? '',
    heroImage: page?.heroImage ?? undefined,
    body: page?.body ?? '',
    sections: withIds(page?.sections ?? []),
    contact: { ...BLANK_CONTACT, ...(page?.contact ?? {}) },
    showInFooter: page?.showInFooter ?? false,
    order: String(page?.order ?? 0),
    status: page?.status ?? 'draft',
    isSample: page?.isSample ?? false,
    metaTitle: page?.seo?.metaTitle ?? '',
    metaDescription: page?.seo?.metaDescription ?? '',
  };
}

const small = 'text-xs text-maroon-700 hover:underline';
const addButton = 'rounded-full border border-cream-300 bg-white px-4 py-1.5 text-xs hover:border-gold-500 disabled:opacity-40';

/**
 * Edits an editable page: banner, Markdown body, typed sections, the contact
 * template's details, visibility and SEO. Saves the whole page each time.
 */
export function PageForm({ page }: { page?: CmsPage }) {
  const router = useRouter();
  const initial = useRef<FormState>(toFormState(page));
  const [form, setForm] = useState<FormState>(() => initial.current);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirm, confirmDialog] = useConfirm();
  const { toast } = useToast();

  const dirty = JSON.stringify(form) !== JSON.stringify(initial.current);
  useUnsavedChangesGuard(dirty && !saving && !deleting);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setContact = <K extends keyof PageContact>(key: K, value: PageContact[K]) =>
    setForm((f) => ({ ...f, contact: { ...f.contact, [key]: value } }));
  const ce = (field: string) => fieldErrors[`contact.${field}`];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});

    const payload: Record<string, unknown> = {
      title: form.title,
      template: form.template,
      eyebrow: form.eyebrow,
      subtitle: form.subtitle,
      heroImage: form.heroImage?.url ? form.heroImage : null,
      body: form.body,
      sections: form.sections,
      showInFooter: form.showInFooter,
      order: Number(form.order) || 0,
      status: form.status,
      isSample: form.isSample,
      seo:
        form.metaTitle || form.metaDescription
          ? {
              ...(form.metaTitle ? { metaTitle: form.metaTitle } : {}),
              ...(form.metaDescription ? { metaDescription: form.metaDescription } : {}),
            }
          : null,
    };
    // Kept when switching away from the contact template, so switching back loses nothing.
    payload.contact = {
      ...form.contact,
      offices: form.contact.offices.map((o) => ({ ...o, lines: o.lines.filter(Boolean) })),
    };
    // Only an explicit change renames the address; the API keeps it on rename.
    if (form.slug && form.slug !== page?.slug) payload.slug = form.slug;

    try {
      if (page) {
        const saved = await adminApi.patch<CmsPage>(`/api/admin/pages/${page._id}`, payload);
        const next = toFormState(saved);
        initial.current = next;
        setForm(next);
        toast({ message: form.status === 'published' ? 'Saved. The change is live on the site.' : 'Saved as a draft.' });
        router.refresh();
      } else {
        const created = await adminApi.post<CmsPage>('/api/admin/pages', payload);
        initial.current = form; // not dirty while navigating away
        toast({ message: `“${form.title}” created.` });
        router.push(`/admin/pages/${created._id}`);
      }
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
        if (err.details) setFieldErrors(err.details);
      } else {
        setError('Could not save the page.');
      }
      toast({ tone: 'error', message: 'The page could not be saved.' });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!page) return;
    const core = ['about', 'contact'].includes(page.slug);
    const ok = await confirm({
      title: 'Delete this page?',
      body: (
        <>
          <strong className="text-ink">{page.title}</strong> will be permanently removed.
          {core
            ? ' The site will go back to building this page from Site settings.'
            : ` Links to /${page.slug} will show “page not found”.`}
        </>
      ),
      confirmLabel: 'Delete page',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await adminApi.remove(`/api/admin/pages/${page._id}`);
      toast({ message: `“${page.title}” was deleted.` });
      router.push('/admin/pages');
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not delete the page.';
      setError(message);
      toast({ tone: 'error', message });
      setDeleting(false);
    }
  }

  const contact = form.contact;

  return (
    <form onSubmit={onSubmit} className="space-y-5 pb-4">
      <FormError message={error} fieldErrors={fieldErrors} />

      <FormSection title="Page">
        <TextField label="Title" name="title" value={form.title} onChange={(v) => set('title', v)} required maxLength={140}
          error={fieldErrors.title} hint="The banner heading, and the link text in the footer unless a meta title is set." />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Address"
            name="slug"
            value={form.slug}
            onChange={(v) => set('slug', v)}
            placeholder={page ? undefined : 'Made from the title'}
            error={fieldErrors.slug}
            hint={page ? `Live at /${page.slug}. Changing it breaks saved links.` : 'Leave blank to use the title, e.g. privacy-policy.'}
          />
          <div>
            <SelectField label="Layout" name="template" value={form.template} onChange={(v) => set('template', v as PageTemplate)}
              options={TEMPLATES.map((t) => ({ value: t.value, label: t.label }))} />
            <p className="mt-1 text-xs text-muted">{TEMPLATES.find((t) => t.value === form.template)?.hint}</p>
          </div>
        </div>
        {page?.sourceNote ? <p className="text-xs text-muted">Source: {page.sourceNote}</p> : null}
      </FormSection>

      <FormSection title="Banner" description="The photographic header at the top of the page.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Eyebrow" name="eyebrow" value={form.eyebrow} onChange={(v) => set('eyebrow', v)} maxLength={80} error={fieldErrors.eyebrow} />
          <TextField label="Subtitle" name="subtitle" value={form.subtitle} onChange={(v) => set('subtitle', v)} maxLength={300} error={fieldErrors.subtitle} />
        </div>
        <ImageUploader name="heroImage" label="Banner photograph" value={form.heroImage} onChange={(v) => set('heroImage', v)}
          error={fieldErrors.heroImage || fieldErrors['heroImage.alt']} />
        {!form.heroImage ? <p className="-mt-2 text-xs text-muted">Without one, the About page banner photograph is used.</p> : null}
      </FormSection>

      <FormSection
        title={form.template === 'legal' ? 'Policy text' : form.template === 'contact' ? 'Introduction' : 'Body'}
        description={form.template === 'contact' ? 'Optional text above the form.' : 'Shown under the banner, before any sections.'}
      >
        <div className="flex justify-end">
          <button type="button" onClick={() => setPreview((p) => !p)} className="text-xs font-medium text-leaf-700 hover:underline" aria-pressed={preview}>
            {preview ? 'Edit text' : 'Preview'}
          </button>
        </div>
        {preview ? (
          <div className="min-h-32 rounded-lg border border-cream-200 bg-cream-50 p-5">
            {form.body.trim() ? <Markdown content={form.body} /> : <p className="text-sm text-muted">Nothing to preview yet.</p>}
          </div>
        ) : (
          <TextArea label="Text" name="body" value={form.body} onChange={(v) => set('body', v)} rows={form.template === 'legal' ? 18 : 8}
            error={fieldErrors.body} hint={MARKDOWN_HINT} />
        )}
      </FormSection>

      {form.template === 'contact' ? (
        <FormSection
          title="Contact details"
          description="Leave a list empty to use the matching details from Site settings › Contact, which the footer also shows."
        >
          <CheckboxField label="Show the enquiry form" checked={contact.showForm} onChange={(v) => setContact('showForm', v)} />
          {contact.showForm ? (
            <TextField label="Form heading" name="contact.formHeading" value={contact.formHeading} maxLength={120}
              onChange={(v) => setContact('formHeading', v)} error={ce('formHeading')} />
          ) : null}
          <TextField label="Opening hours / response time" name="contact.hours" value={contact.hours} maxLength={160}
            onChange={(v) => setContact('hours', v)} error={ce('hours')} hint="Blank uses Site settings › Contact › Support hours." />

          <Repeater title="Email addresses" empty="Using the Site settings email." count={contact.emails.length} max={6}
            onAdd={() => setContact('emails', [...contact.emails, { label: '', address: '' }])}>
            {contact.emails.map((email, i) => (
              <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_1.4fr_auto]">
                <TextField label="Label" name={`contact.emails.${i}.label`} value={email.label} placeholder="Bookings" maxLength={60}
                  onChange={(v) => setContact('emails', contact.emails.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                <TextField label="Address *" name={`contact.emails.${i}.address`} type="email" value={email.address}
                  error={ce(`emails.${i}.address`)}
                  onChange={(v) => setContact('emails', contact.emails.map((x, j) => (j === i ? { ...x, address: v } : x)))} />
                <button type="button" className={`${small} pb-3`} onClick={() => setContact('emails', contact.emails.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
            ))}
          </Repeater>

          <Repeater title="Phone numbers" empty="Using the Site settings phone and WhatsApp numbers." count={contact.phones.length} max={6}
            onAdd={() => setContact('phones', [...contact.phones, { label: '', number: '', whatsapp: false }])}>
            {contact.phones.map((phone, i) => (
              <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_1.4fr_auto_auto]">
                <TextField label="Label" name={`contact.phones.${i}.label`} value={phone.label} placeholder="Reservations" maxLength={60}
                  onChange={(v) => setContact('phones', contact.phones.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                <TextField label="Number *" name={`contact.phones.${i}.number`} value={phone.number} placeholder="+254 712 345 678"
                  error={ce(`phones.${i}.number`)}
                  onChange={(v) => setContact('phones', contact.phones.map((x, j) => (j === i ? { ...x, number: v } : x)))} />
                <label className="flex items-center gap-2 pb-3 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-gold-500" checked={phone.whatsapp}
                    onChange={(e) => setContact('phones', contact.phones.map((x, j) => (j === i ? { ...x, whatsapp: e.target.checked } : x)))} />
                  WhatsApp
                </label>
                <button type="button" className={`${small} pb-3`} onClick={() => setContact('phones', contact.phones.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
            ))}
          </Repeater>

          <Repeater title="Offices" empty="Using the Site settings address." count={contact.offices.length} max={4}
            onAdd={() => setContact('offices', [...contact.offices, { name: '', lines: [], hours: '', mapUrl: '' }])}>
            {contact.offices.map((office, i) => {
              const patch = (p: Partial<typeof office>) =>
                setContact('offices', contact.offices.map((x, j) => (j === i ? { ...x, ...p } : x)));
              return (
                <div key={i} className="space-y-3 rounded-lg border border-cream-200 bg-cream-50/60 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted">Office {i + 1}</p>
                    <button type="button" className={small} onClick={() => setContact('offices', contact.offices.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField label="Name *" name={`contact.offices.${i}.name`} value={office.name} placeholder="Nairobi head office"
                      maxLength={80} error={ce(`offices.${i}.name`)} onChange={(v) => patch({ name: v })} />
                    <TextField label="Hours" name={`contact.offices.${i}.hours`} value={office.hours ?? ''} maxLength={160}
                      placeholder="Mon–Fri 8am–5pm" onChange={(v) => patch({ hours: v })} />
                  </div>
                  <ListField label="Address lines" value={office.lines} rows={3} onChange={(v) => patch({ lines: v })} />
                  <TextField label="Map link" name={`contact.offices.${i}.mapUrl`} value={office.mapUrl ?? ''}
                    error={ce(`offices.${i}.mapUrl`)} onChange={(v) => patch({ mapUrl: v })}
                    hint="Optional. Blank searches Google Maps for the address." />
                </div>
              );
            })}
          </Repeater>

          <fieldset>
            <legend className="mb-1 text-sm font-medium">Social links</legend>
            <p className="mb-3 text-xs text-muted">Leave all blank to use the Site settings socials.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(SOCIAL_LABELS) as SocialKey[]).map((key) => (
                <TextField key={key} label={SOCIAL_LABELS[key]} name={`contact.socials.${key}`} value={contact.socials?.[key] ?? ''}
                  placeholder="https://" error={ce(`socials.${key}`)}
                  onChange={(v) => setContact('socials', { ...contact.socials, [key]: v })} />
              ))}
            </div>
          </fieldset>
        </FormSection>
      ) : null}

      <FormSection title="Sections" description="Blocks shown after the body, in this order.">
        <PageSectionsEditor value={form.sections} onChange={(v) => set('sections', v)} errors={fieldErrors} />
        {form.sections.length === 0 && form.template === 'standard' && !form.body ? (
          <button type="button" className={addButton} onClick={() => set('sections', [blankSection('text')])}>
            Start with a text section
          </button>
        ) : null}
      </FormSection>

      <FormSection title="Visibility">
        <SelectField label="Status" name="status" value={form.status} onChange={(v) => set('status', v as FormState['status'])}
          options={[
            { value: 'draft', label: 'Draft: hidden from the site' },
            { value: 'published', label: 'Published: live' },
          ]} />
        <CheckboxField label="Show in footer" checked={form.showInFooter} onChange={(v) => set('showInFooter', v)}
          hint="Listed under Company in the site footer once published." />
        <CheckboxField label="Sample content" checked={form.isSample} onChange={(v) => set('isSample', v)}
          hint="Placeholder text. Shows a Sample badge on the page." />
        <TextField label="Order" name="order" type="number" value={form.order} onChange={(v) => set('order', v)}
          hint="Lower numbers come first in the footer." error={fieldErrors.order} />
      </FormSection>

      <FormSection title="SEO" description="Search-engine title and description.">
        <TextField label="Meta title" name="metaTitle" value={form.metaTitle} onChange={(v) => set('metaTitle', v)} maxLength={70}
          hint="Falls back to the title. Also the footer link text." error={fieldErrors['seo.metaTitle']} />
        <TextArea label="Meta description" name="metaDescription" value={form.metaDescription} onChange={(v) => set('metaDescription', v)}
          rows={2} maxLength={180} hint="Falls back to the subtitle, then the first paragraph." error={fieldErrors['seo.metaDescription']} />
      </FormSection>

      <FormActions saving={saving} onDelete={page ? onDelete : undefined} deleting={deleting}
        submitLabel={page ? 'Save changes' : 'Create page'} dirty={dirty} />

      {confirmDialog}
    </form>
  );
}

function Repeater({
  title,
  empty,
  count,
  max,
  onAdd,
  children,
}: {
  title: string;
  empty: string;
  count: number;
  max: number;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-medium">{title}</legend>
      {count === 0 ? <p className="text-xs text-muted">{empty}</p> : children}
      <button type="button" className={addButton} onClick={onAdd} disabled={count >= max}>
        + Add
      </button>
    </fieldset>
  );
}
