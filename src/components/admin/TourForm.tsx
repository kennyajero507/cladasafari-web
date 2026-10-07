'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { useUnsavedChangesGuard } from '@/lib/useUnsavedChanges';
import {
  TextField,
  TextArea,
  SelectField,
  CheckboxField,
  ListField,
  FormSection,
  FormActions,
} from './FormControls';
import { ImageUploader } from './ImageUploader';
import { GalleryEditor } from './GalleryEditor';
import { ItineraryEditor } from './ItineraryEditor';
import { FormError } from './FormError';
import { useConfirm } from './ConfirmDialog';
import { useToast } from './Toasts';
import type { Tour, Destination, ItineraryDay, ApiImage, Category, CountryInfo, TravelArea } from '@/types';

interface FormState {
  title: string;
  category: string;
  summary: string;
  description: string;
  priceFrom: string;
  currency: string;
  durationDays: string;
  durationNights: string;
  groupSizeMax: string;
  difficulty: string;
  rating: string;
  reviewCount: string;
  destination: string;
  countries: string[];
  /** Travel area slugs (Diani, France...), for the homepage region tabs. */
  areas: string[];
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  parks: string[];
  locationLabel: string;
  departsFrom: string;
  visaSupport: boolean;
  flightsIncluded: boolean;
  gameDriveCount: string;
  conservancyFeesIncluded: boolean;
  isSample: boolean;
  heroImage?: ApiImage;
  gallery: ApiImage[];
  itinerary: ItineraryDay[];
  featured: boolean;
  bestSelling: boolean;
  status: string;
  order: string;
  metaTitle: string;
  metaDescription: string;
}

function toFormState(tour?: Tour): FormState {
  return {
    title: tour?.title ?? '',
    category: tour?.category ?? '',
    summary: tour?.summary ?? '',
    description: tour?.description ?? '',
    priceFrom: String(tour?.priceFrom ?? ''),
    currency: tour?.currency ?? 'KES',
    durationDays: String(tour?.durationDays ?? ''),
    durationNights: tour?.durationNights === undefined ? '' : String(tour.durationNights),
    groupSizeMax: String(tour?.groupSizeMax ?? 7),
    difficulty: tour?.difficulty ?? 'easy',
    rating: String(tour?.rating ?? 0),
    reviewCount: String(tour?.reviewCount ?? 0),
    destination: tour?.destination?._id ?? '',
    countries: tour?.countries ?? [],
    areas: tour?.areas?.map((a) => a.slug) ?? [],
    highlights: tour?.highlights ?? [],
    inclusions: tour?.inclusions ?? [],
    exclusions: tour?.exclusions ?? [],
    parks: tour?.parks ?? [],
    locationLabel: tour?.locationLabel ?? '',
    departsFrom: tour?.departsFrom ?? '',
    visaSupport: tour?.visaSupport ?? false,
    flightsIncluded: tour?.flightsIncluded ?? false,
    gameDriveCount: tour?.gameDriveCount == null ? '' : String(tour.gameDriveCount),
    conservancyFeesIncluded: tour?.conservancyFeesIncluded ?? false,
    isSample: tour?.isSample ?? false,
    heroImage: tour?.heroImage,
    gallery: tour?.gallery ?? [],
    itinerary: tour?.itinerary ?? [],
    featured: tour?.featured ?? false,
    bestSelling: tour?.bestSelling ?? false,
    status: tour?.status ?? 'draft',
    order: String(tour?.order ?? 0),
    metaTitle: tour?.seo?.metaTitle ?? '',
    metaDescription: tour?.seo?.metaDescription ?? '',
  };
}

export function TourForm({
  tour,
  destinations,
  categories,
  countries,
  areas = [],
}: {
  tour?: Tour;
  destinations: Destination[];
  /** The category tree; tours belong to its leaves. */
  categories: Category[];
  countries: CountryInfo[];
  /** The travel area tree; tours can sit in several areas. */
  areas?: TravelArea[];
}) {
  // Leaves only: a tour sits in "Kenyan Safaris", never in "Safaris" itself.
  // Drafts are listed (and labelled) so a package in one keeps its category.
  const draft = (c: Category) => (c.status === 'draft' ? ' (draft)' : '');
  const leaves = categories.flatMap((group) =>
    group.children?.length
      ? group.children.map((c) => ({ ...c, label: `${group.name} › ${c.name}${draft(c)}${draft(group)}` }))
      : [{ ...group, label: `${group.name}${draft(group)}` }]
  );
  // Until the lists load, or if this category is somehow missing from them,
  // the current value stays selectable rather than silently becoming blank.
  if (tour && !leaves.some((c) => c.slug === tour.category)) {
    leaves.push({
      ...(tour.categoryInfo as unknown as Category),
      slug: tour.category,
      label: tour.categoryInfo?.group ? `${tour.categoryInfo.group.name} › ${tour.categoryInfo.name}` : tour.categoryInfo?.name ?? tour.category,
    });
  }
  const router = useRouter();
  const initial = useRef<FormState>(toFormState(tour));
  const [form, setForm] = useState<FormState>(() => initial.current);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [confirm, confirmDialog] = useConfirm();
  const { toast } = useToast();

  // Leaving with unsaved edits used to discard a long form silently.
  const dirty = JSON.stringify(form) !== JSON.stringify(initial.current);
  useUnsavedChangesGuard(dirty && !saving && !deleting);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const kind = leaves.find((c) => c.slug === form.category)?.kind;
  const isSafari = kind === 'safari';

  /** The primary destination's country is always visited; the API enforces it too. */
  function chooseDestination(id: string) {
    const country = destinations.find((d) => d._id === id)?.country;
    setForm((f) => ({
      ...f,
      destination: id,
      countries: country && !f.countries.includes(country) ? [...f.countries, country] : f.countries,
    }));
  }
  // Destination pages are per country, so these are where the package will be listed.
  const listedOn = destinations.filter((d) => form.countries.includes(d.country));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});

    if (!form.heroImage?.url || !form.heroImage.alt) {
      // Reported against the field itself, so the banner's jump-link lands on
      // the uploader rather than leaving the admin to hunt for it.
      setError('A hero image with alt text is required.');
      setFieldErrors({ heroImage: 'Upload an image and describe it.' });
      setSaving(false);
      return;
    }

    const payload: Record<string, unknown> = {
      title: form.title,
      summary: form.summary,
      description: form.description,
      priceFrom: Number(form.priceFrom),
      currency: form.currency,
      durationDays: Number(form.durationDays),
      groupSizeMax: Number(form.groupSizeMax),
      order: Number(form.order),
      difficulty: form.difficulty,
      rating: Number(form.rating),
      reviewCount: Number(form.reviewCount),
      countries: form.countries,
      areas: form.areas,
      locationLabel: form.locationLabel,
      highlights: form.highlights,
      inclusions: form.inclusions,
      exclusions: form.exclusions,
      heroImage: form.heroImage,
      gallery: form.gallery.filter((g) => g.url && g.alt),
      itinerary: form.itinerary,
      featured: form.featured,
      bestSelling: form.bestSelling,
      status: form.status,
      isSample: form.isSample,
      category: form.category,
    };

    // Blank means "derive from days" on the server, so only send a real value.
    if (form.durationNights !== '') payload.durationNights = Number(form.durationNights);

    if (form.metaTitle || form.metaDescription) {
      payload.seo = {
        ...(form.metaTitle ? { metaTitle: form.metaTitle } : {}),
        ...(form.metaDescription ? { metaDescription: form.metaDescription } : {}),
      };
    }

    payload.destination = form.destination || null;
    if (isSafari) {
      payload.parks = form.parks;
      payload.gameDriveCount = form.gameDriveCount === '' ? null : Number(form.gameDriveCount);
      payload.conservancyFeesIncluded = form.conservancyFeesIncluded;
    } else {
      payload.departsFrom = form.departsFrom;
      payload.visaSupport = form.visaSupport;
      payload.flightsIncluded = form.flightsIncluded;
    }

    try {
      if (tour) {
        await adminApi.patch(`/api/admin/tours/${tour._id}`, payload);
        // The form now matches what is stored, so it is no longer dirty.
        initial.current = form;
        toast({
          message:
            form.status === 'published'
              ? 'Saved. The change is live on the public site.'
              : 'Saved as a draft.',
        });
      } else {
        const created = await adminApi.post<Tour>('/api/admin/tours', payload);
        toast({ message: `"${form.title}" created.` });
        router.push(`/admin/tours/${created._id}`);
        router.refresh();
        return;
      }
      router.refresh();
      setError('');
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
        if (err.details) setFieldErrors(err.details);
      } else {
        setError('Could not save the package.');
      }
      toast({ tone: 'error', message: 'The package could not be saved.' });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!tour) return;

    const ok = await confirm({
      title: 'Delete this tour?',
      body: (
        <>
          <strong className="text-ink">{tour.title}</strong> will be permanently removed, along with
          its itinerary and gallery. This cannot be undone.
        </>
      ),
      confirmLabel: 'Delete tour',
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await adminApi.remove(`/api/admin/tours/${tour._id}`);
      toast({ message: `"${tour.title}" was deleted.` });
      router.push('/admin/tours');
      router.refresh();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not delete the tour.';
      setError(message);
      toast({ tone: 'error', message });
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 pb-4">
      <FormError message={error} fieldErrors={fieldErrors} />

      <FormSection title="Basics">
        <TextField
          label="Title"
          name="title"
          value={form.title}
          onChange={(v) => set('title', v)}
          required
          error={fieldErrors.title}
        />

        <SelectField
          label="Category"
          name="category"
          value={form.category}
          onChange={(v) => set('category', v)}
          options={[
            { value: '', label: 'Choose a category…' },
            ...leaves.map((c) => ({ value: c.slug, label: c.label })),
          ]}
        />
        {leaves.find((c) => c.slug === form.category)?.status === 'draft' ? (
          <p className="-mt-2 text-xs text-muted">
            This category is a draft, so it is not in the site menu or the package filters yet.
          </p>
        ) : null}
        {fieldErrors.category ? <p className="-mt-2 text-xs text-maroon-600">{fieldErrors.category}</p> : null}

        <TextField
          label="Place line"
          name="locationLabel"
          value={form.locationLabel}
          onChange={(v) => set('locationLabel', v)}
          hint="Shown above the title on cards, for example Diani, Coast or 4-Country Circuit."
          error={fieldErrors.locationLabel}
        />
        {tour?.sourceNote ? <p className="-mt-2 text-xs text-muted">Source: {tour.sourceNote}</p> : null}

        <TextArea
          label="Summary"
          name="summary"
          value={form.summary}
          onChange={(v) => set('summary', v)}
          rows={2}
          required
          hint="Shown on cards. Maximum 300 characters."
          error={fieldErrors.summary}
        />

        <TextArea
          label="Full description"
          name="description"
          value={form.description}
          onChange={(v) => set('description', v)}
          rows={6}
          required
          error={fieldErrors.description}
        />
      </FormSection>

      <FormSection title="Pricing and logistics">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Price from"
            name="priceFrom"
            type="number"
            value={form.priceFrom}
            onChange={(v) => set('priceFrom', v)}
            required
            error={fieldErrors.priceFrom}
          />
          <SelectField
            label="Currency"
            name="currency"
            value={form.currency}
            onChange={(v) => set('currency', v)}
            options={[
              { value: 'KES', label: 'KES: Kenya shillings (local packages)' },
              { value: 'USD', label: 'USD: US dollars (safaris and international)' },
            ]}
          />
          <TextField
            label="Duration (days)"
            name="durationDays"
            type="number"
            value={form.durationDays}
            onChange={(v) => set('durationDays', v)}
            required
            error={fieldErrors.durationDays}
          />
          <TextField
            label="Duration (nights)"
            name="durationNights"
            type="number"
            value={form.durationNights}
            onChange={(v) => set('durationNights', v)}
            hint="Leave blank for one fewer than the number of days."
            error={fieldErrors.durationNights}
          />
          <TextField
            label="Maximum guests"
            name="groupSizeMax"
            type="number"
            value={form.groupSizeMax}
            onChange={(v) => set('groupSizeMax', v)}
          />
          <SelectField
            label="Difficulty"
            name="difficulty"
            value={form.difficulty}
            onChange={(v) => set('difficulty', v)}
            options={[
              { value: 'easy', label: 'Easy / relaxed' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'challenging', label: 'Challenging' },
            ]}
          />
          <div>
            <SelectField
              label="Primary destination"
              name="destination"
              value={form.destination}
              onChange={chooseDestination}
              options={[
                { value: '', label: '(none)' },
                ...destinations.map((d) => ({ value: d._id, label: `${d.name}${d.status === 'draft' ? ' (draft)' : ''}` })),
              ]}
            />
            <p className="mt-1 text-xs text-muted">Its country is ticked below. Used for the tour page&apos;s place line.</p>
            {fieldErrors.destination ? <p className="mt-1 text-xs text-maroon-600">{fieldErrors.destination}</p> : null}
          </div>
          <TextField
            label="Rating"
            name="rating"
            type="number"
            value={form.rating}
            onChange={(v) => set('rating', v)}
            hint="Only shown when there is at least one review."
          />
          <TextField
            label="Review count"
            name="reviewCount"
            type="number"
            value={form.reviewCount}
            onChange={(v) => set('reviewCount', v)}
            hint="Keep at 0 until you have genuine reviews."
          />
          {isSafari ? (
            <TextField
              label="Game drives"
              name="gameDriveCount"
              type="number"
              value={form.gameDriveCount}
              onChange={(v) => set('gameDriveCount', v)}
            />
          ) : (
            <TextField
              label="Departs from"
              name="departsFrom"
              value={form.departsFrom}
              onChange={(v) => set('departsFrom', v)}
            />
          )}
        </div>

        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-ink">Countries visited</legend>
          <p className="mb-3 text-xs text-muted">
            {listedOn.length
              ? `Listed on the ${listedOn.map((d) => d.name + (d.status === 'draft' ? ' (draft)' : '')).join(', ')} destination ${listedOn.length === 1 ? 'page' : 'pages'}.`
              : 'Tick every country the trip visits; it is listed on each one’s destination page.'}
          </p>
          <div className="flex flex-wrap gap-3">
            {countries.map(({ name: c }) => (
              <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.countries.includes(c)}
                  onChange={(e) =>
                    set(
                      'countries',
                      e.target.checked
                        ? [...form.countries, c]
                        : form.countries.filter((x) => x !== c)
                    )
                  }
                  className="h-4 w-4 accent-gold-500"
                />
                {c}
              </label>
            ))}
          </div>
        </fieldset>

        {areas.length > 0 ? (
          <fieldset>
            <legend className="mb-1 block text-sm font-medium text-ink">Areas</legend>
            <p className="mb-3 text-xs text-muted">
              Where the trip goes. Drives the region tabs in the homepage packages section; tick every area it visits.
            </p>
            <div className="space-y-3">
              {areas.map((group) => (
                <div key={group.slug} className="flex flex-col gap-2 sm:flex-row sm:items-baseline">
                  <span className="w-40 shrink-0 text-xs uppercase tracking-wider text-muted">{group.name}</span>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {(group.children ?? []).map((area) => (
                      <label key={area.slug} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.areas.includes(area.slug)}
                          onChange={(e) =>
                            set(
                              'areas',
                              e.target.checked
                                ? [...form.areas, area.slug]
                                : form.areas.filter((x) => x !== area.slug)
                            )
                          }
                          className="h-4 w-4 accent-gold-500"
                        />
                        {area.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        ) : null}

        {isSafari ? (
          <CheckboxField
            label="Park and conservancy fees included"
            checked={form.conservancyFeesIncluded}
            onChange={(v) => set('conservancyFeesIncluded', v)}
          />
        ) : (
          <div className="flex flex-wrap gap-6">
            <CheckboxField
              label="Visa application support"
              checked={form.visaSupport}
              onChange={(v) => set('visaSupport', v)}
            />
            <CheckboxField
              label="Flights included in the price"
              checked={form.flightsIncluded}
              onChange={(v) => set('flightsIncluded', v)}
            />
          </div>
        )}
      </FormSection>

      <FormSection title="Imagery">
        <ImageUploader
          name="heroImage"
          label="Hero image"
          value={form.heroImage}
          onChange={(v) => set('heroImage', v)}
          required
          error={fieldErrors.heroImage}
        />

        <GalleryEditor value={form.gallery} onChange={(v) => set('gallery', v)} />
      </FormSection>

      <FormSection title="Content">
        <ListField
          label="Highlights"
          value={form.highlights}
          onChange={(v) => set('highlights', v)}
        />
        {isSafari ? (
          <ListField label="Parks visited" value={form.parks} onChange={(v) => set('parks', v)} />
        ) : null}
        <ListField
          label="What's included"
          value={form.inclusions}
          onChange={(v) => set('inclusions', v)}
          rows={7}
        />
        <ListField
          label="What's not included"
          value={form.exclusions}
          onChange={(v) => set('exclusions', v)}
          rows={6}
        />
      </FormSection>

      <FormSection title="Itinerary" description="Shown as a day-by-day timeline on the tour page.">
        <ItineraryEditor days={form.itinerary} onChange={(v) => set('itinerary', v)} />
      </FormSection>

      <FormSection title="Visibility">
        <SelectField
          label="Status"
          name="status"
          value={form.status}
          onChange={(v) => set('status', v)}
          options={[
            { value: 'draft', label: 'Draft: hidden from the public site' },
            { value: 'published', label: 'Published: live' },
          ]}
        />
        <CheckboxField
          label="Featured"
          checked={form.featured}
          onChange={(v) => set('featured', v)}
          hint="Prioritised in listings."
        />
        <CheckboxField
          label="Best selling"
          checked={form.bestSelling}
          onChange={(v) => set('bestSelling', v)}
          hint="Shows a best-seller badge."
        />
        <CheckboxField
          label="Sample package"
          checked={form.isSample}
          onChange={(v) => set('isSample', v)}
          hint="Demo content. Shows a Sample badge on the public site."
        />
        <TextField
          label="Order"
          name="order"
          type="number"
          value={form.order}
          onChange={(v) => set('order', v)}
          hint="Lower numbers sort first in listings."
          error={fieldErrors.order}
        />
      </FormSection>

      <FormSection title="SEO" description="Used where this tour needs its own meta tags.">
        <TextField
          label="Meta title"
          name="metaTitle"
          value={form.metaTitle}
          onChange={(v) => set('metaTitle', v)}
          maxLength={70}
          hint="Falls back to the tour title."
          error={fieldErrors['seo.metaTitle']}
        />
        <TextArea
          label="Meta description"
          name="metaDescription"
          value={form.metaDescription}
          onChange={(v) => set('metaDescription', v)}
          rows={2}
          maxLength={180}
          hint="Falls back to the summary."
          error={fieldErrors['seo.metaDescription']}
        />
      </FormSection>

      <FormActions
        saving={saving}
        onDelete={tour ? onDelete : undefined}
        deleting={deleting}
        submitLabel={tour ? 'Save changes' : 'Create package'}
        dirty={dirty}
      />

      {confirmDialog}
    </form>
  );
}
