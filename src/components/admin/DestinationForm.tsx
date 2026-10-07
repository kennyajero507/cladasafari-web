'use client';

import { useEffect, useRef, useState } from 'react';
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
import { ParksEditor } from './ParksEditor';
import { FormError } from './FormError';
import { useConfirm } from './ConfirmDialog';
import { useToast } from './Toasts';
import type { Destination, Park, ApiImage, CountryOption, Region } from '@/types';


const REGIONS: { value: Region; label: string }[] = [
  { value: 'east-africa', label: 'East Africa' },
  { value: 'africa', label: 'Africa' },
  { value: 'europe', label: 'Europe' },
  { value: 'middle-east', label: 'Middle East' },
  { value: 'asia', label: 'Asia' },
  { value: 'americas', label: 'Americas' },
  { value: 'oceania', label: 'Oceania' },
  { value: 'other', label: 'Elsewhere' },
];

/** "kenya", " KE " and "Kenya" all find Kenya: by ISO code or by name, ignoring case. */
function findCountry(options: CountryOption[], value: string): CountryOption | undefined {
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  return options.find((o) => o.code.toLowerCase() === v || o.name.toLowerCase() === v);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function DestinationForm({ destination }: { destination?: Destination }) {
  const router = useRouter();

  // Every ISO country, so a page can be made for anywhere, not just the
  // countries already in the catalogue (which all had pages, so every choice
  // the old dropdown offered was refused).
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  useEffect(() => {
    adminApi.get<CountryOption[]>('/api/admin/countries/options').then(setCountryOptions).catch(() => setCountryOptions([]));
  }, []);

  const [name, setName] = useState(destination?.name ?? '');
  // The country's name as typed or picked; mapped to its ISO code on submit.
  const [country, setCountry] = useState<string>(destination?.country ?? '');
  const [region, setRegion] = useState<string>(destination?.region ?? '');
  const [tagline, setTagline] = useState(destination?.tagline ?? '');
  const [categoryLabel, setCategoryLabel] = useState(destination?.categoryLabel ?? 'Country');
  const [overview, setOverview] = useState(destination?.overview ?? '');
  const [heroImage, setHeroImage] = useState<ApiImage | undefined>(destination?.heroImage);
  const [cardImage, setCardImage] = useState<ApiImage | undefined>(destination?.cardImage);
  const [highlights, setHighlights] = useState<string[]>(destination?.highlights ?? []);
  const [months, setMonths] = useState<string[]>(destination?.bestTime?.months ?? []);
  const [bestTimeNote, setBestTimeNote] = useState(destination?.bestTime?.note ?? '');
  const [parks, setParks] = useState<Park[]>(destination?.parks ?? []);
  const [featured, setFeatured] = useState(destination?.featured ?? false);
  const [order, setOrder] = useState(String(destination?.order ?? 0));
  const [status, setStatus] = useState(destination?.status ?? 'draft');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [confirm, confirmDialog] = useConfirm();
  const { toast } = useToast();

  const snapshot = JSON.stringify({
    name,
    country,
    region,
    tagline,
    categoryLabel,
    overview,
    heroImage,
    cardImage,
    highlights,
    months,
    bestTimeNote,
    parks,
    featured,
    order,
    status,
  });
  const initial = useRef(snapshot);
  const dirty = snapshot !== initial.current;
  useUnsavedChangesGuard(dirty && !saving && !deleting);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!heroImage?.url || !heroImage.alt || !cardImage?.url || !cardImage.alt) {
      setError('Both a hero image and a card image are required, each with alt text.');
      setFieldErrors({
        ...(!heroImage?.url || !heroImage.alt
          ? { heroImage: 'Upload an image and describe it.' }
          : {}),
        ...(!cardImage?.url || !cardImage.alt
          ? { cardImage: 'Upload an image and describe it.' }
          : {}),
      });
      return;
    }

    // The API takes the ISO code. Check here first, so a typo or a country
    // that already has a page is reported on the field without a round trip.
    const picked = findCountry(countryOptions, country);
    if (countryOptions.length && !picked) {
      setError('Please correct the highlighted fields.');
      setFieldErrors({ country: country.trim() ? `"${country.trim()}" is not a country we recognise. Choose one from the list.` : 'Choose a country.' });
      return;
    }
    if (picked?.destination && picked.destination.id !== destination?._id) {
      setError('Please correct the highlighted fields.');
      setFieldErrors({ country: `${picked.name} already has a destination page (${picked.destination.name}).` });
      return;
    }

    setSaving(true);
    setError('');
    setFieldErrors({});

    const body = {
      name,
      // If the list failed to load, send what was typed; the API accepts names too.
      country: picked?.code ?? destination?.countryCode ?? country.trim(),
      region: region || undefined,
      tagline: tagline || undefined,
      categoryLabel,
      overview,
      heroImage,
      cardImage,
      highlights,
      bestTime: { months, note: bestTimeNote || undefined },
      // Drop half-filled rows so an empty repeater slot cannot fail validation.
      parks: parks
        .filter((p) => p.name.trim())
        .map((p) => ({
          ...p,
          // An empty uploader slot is "no image", not an invalid image.
          image: p.image?.url ? { url: p.image.url, alt: p.image.alt || p.name } : null,
        })),
      featured,
      order: Number(order),
      status,
    };

    try {
      if (destination) {
        await adminApi.patch(`/api/admin/destinations/${destination._id}`, body);
        initial.current = snapshot;
        toast({
          message:
            status === 'published'
              ? 'Saved. The change is live on the public site.'
              : 'Saved as a draft.',
        });
        router.refresh();
      } else {
        const created = await adminApi.post<Destination>('/api/admin/destinations', body);
        toast({ message: `${name} created.` });
        router.push(`/admin/destinations/${created._id}`);
        router.refresh();
      }
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
        if (err.details) setFieldErrors(err.details);
      } else {
        setError('Could not save the destination.');
      }
      toast({ tone: 'error', message: 'The destination could not be saved.' });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!destination) return;

    const ok = await confirm({
      title: 'Delete this destination?',
      body: (
        <>
          <strong className="text-ink">{destination.name}</strong> will be permanently removed, along
          with its places. Packages linked to it will keep working. This cannot be undone.
        </>
      ),
      confirmLabel: 'Delete destination',
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await adminApi.remove(`/api/admin/destinations/${destination._id}`);
      toast({ message: `${destination.name} was deleted.` });
      router.push('/admin/destinations');
      router.refresh();
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : 'Could not delete.';
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
          label="Name"
          name="name"
          value={name}
          onChange={setName}
          required
          error={fieldErrors.name}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-ink">
              Country <span className="text-muted">*</span>
            </label>
            <input
              id="country"
              name="country"
              list="country-options"
              required
              autoComplete="off"
              placeholder={countryOptions.length ? 'Start typing, e.g. Morocco' : 'Loading countries…'}
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                // Suggest the region for a newly picked country; the select below can change it.
                const match = findCountry(countryOptions, e.target.value);
                if (match && match.code !== destination?.countryCode) setRegion(match.region);
              }}
              aria-invalid={fieldErrors.country ? true : undefined}
              aria-describedby={fieldErrors.country ? 'country-error' : 'country-hint'}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${
                fieldErrors.country ? 'border-maroon-600' : 'border-cream-300 focus:border-gold-500'
              }`}
            />
            <datalist id="country-options">
              {countryOptions.map((o) => (
                <option key={o.code} value={o.name}>
                  {o.destination && o.destination.id !== destination?._id ? `${o.code} · has a page` : o.code}
                </option>
              ))}
            </datalist>
            {fieldErrors.country ? (
              <p id="country-error" className="mt-1 text-xs text-maroon-600">
                {fieldErrors.country}
              </p>
            ) : (
              <p id="country-hint" className="mt-1 text-xs text-muted">
                Any country. One destination page per country.
              </p>
            )}
          </div>
          <div>
            <SelectField
              label="Region"
              name="region"
              value={region}
              onChange={setRegion}
              options={[{ value: '', label: 'Suggested from the country' }, ...REGIONS]}
            />
            <p className="mt-1 text-xs text-muted">Groups the destination on the Destinations page and in tour filters.</p>
          </div>
          <TextField
            label="Category label"
            name="categoryLabel"
            value={categoryLabel}
            onChange={setCategoryLabel}
            hint="Shown above the name on cards, e.g. East Africa or Europe."
          />
        </div>
        <TextField
          label="Tagline"
          name="tagline"
          value={tagline}
          onChange={setTagline}
          hint="One line shown under the name on cards and the banner."
        />
        <TextArea
          label="Overview"
          name="overview"
          value={overview}
          onChange={setOverview}
          rows={6}
          required
          error={fieldErrors.overview}
        />
      </FormSection>

      <FormSection title="Imagery">
        <ImageUploader label="Hero image (page banner)" value={heroImage} onChange={setHeroImage} required />
        <ImageUploader label="Card image (grids)" value={cardImage} onChange={setCardImage} required />
      </FormSection>

      <FormSection title="Highlights and season">
        <ListField label="Highlights" value={highlights} onChange={setHighlights} />

        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-ink">Best months to visit</legend>
          <div className="flex flex-wrap gap-2">
            {MONTHS.map((m) => (
              <label
                key={m}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  months.includes(m)
                    ? 'border-gold-500 bg-gold-500 text-charcoal-950'
                    : 'border-cream-300 text-muted hover:border-gold-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={months.includes(m)}
                  onChange={(e) =>
                    setMonths(
                      e.target.checked ? [...months, m] : months.filter((x) => x !== m)
                    )
                  }
                  className="sr-only"
                />
                {m.slice(0, 3)}
              </label>
            ))}
          </div>
        </fieldset>

        <TextArea
          label="Season note"
          name="bestTimeNote"
          value={bestTimeNote}
          onChange={setBestTimeNote}
          rows={3}
          hint="Explain the trade-offs between seasons."
        />
      </FormSection>

      <FormSection
        title="Places"
        description="Each appears as a card on the destination page."
      >
        <ParksEditor parks={parks} onChange={setParks} />
      </FormSection>

      <FormSection title="Visibility">
        <SelectField
          label="Status"
          name="status"
          value={status}
          onChange={(v) => setStatus(v as Destination['status'])}
          options={[
            { value: 'draft', label: 'Draft: hidden from the public site' },
            { value: 'published', label: 'Published: live' },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Order" name="order" type="number" value={order} onChange={setOrder} />
        </div>
        <CheckboxField
          label="Featured"
          checked={featured}
          onChange={setFeatured}
          hint="Prioritised on the homepage countries grid."
        />
      </FormSection>

      <FormActions
        dirty={dirty}
        saving={saving}
        onDelete={destination ? onDelete : undefined}
        deleting={deleting}
        submitLabel={destination ? 'Save changes' : 'Create destination'}
      />

      {confirmDialog}
    </form>
  );
}
