'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { useUnsavedChangesGuard } from '@/lib/useUnsavedChanges';
import { TextField, TextArea, ListField, FormSection, FormActions } from '@/components/admin/FormControls';
import { whatsappNumber } from '@/lib/format';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { FormError } from '@/components/admin/FormError';
import { useToast } from '@/components/admin/Toasts';
import type { SiteSettings } from '@/types';

/**
 * Mirrors the caps in api/src/validators/settings.validator.js. Enforcing them
 * in the inputs stops a long paste from failing the whole save, previously the
 * only feedback was a generic "correct the highlighted fields" with nothing
 * highlighted.
 */
const LIMITS = {
  heroTitle: 160,
  heroSubtitle: 400,
  ctaLabel: 60,
  ctaHref: 200,
  valueTitle: 80,
  valueDescription: 400,
  phone: 40,
  email: 160,
  addressLine: 200,
  poBox: 80,
  city: 120,
  supportHours: 120,
  social: 200,
  newsletterHeading: 120,
  newsletterBlurb: 400,
  footerBlurb: 600,
  youtubeId: 11,
  seoTitle: 70,
  seoDescription: 200,
} as const;

/**
 * Takes whatever the admin pasted and returns a bare video ID.
 *
 * The API wants the 11-character ID, but the natural thing to paste is the URL
 * from the browser bar, in any of several shapes (watch?v=, youtu.be/, /embed/,
 * /shorts/, with or without extra query parameters). Rather than reject those
 * and make the admin dissect a URL by hand, pull the ID out here. Anything that
 * is not recognisably a YouTube URL is passed through untouched so the server's
 * validation message is what they see.
 */
function extractYoutubeId(input: string): string {
  const value = input.trim();
  if (!value) return '';

  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/, // watch?v=ID
    /youtu\.be\/([A-Za-z0-9_-]{11})/, // youtu.be/ID
    /\/embed\/([A-Za-z0-9_-]{11})/, // /embed/ID
    /\/shorts\/([A-Za-z0-9_-]{11})/, // /shorts/ID
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }

  return value;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const { toast } = useToast();

  const initial = useRef<string | null>(null);

  useEffect(() => {
    adminApi
      .get<SiteSettings>('/api/settings')
      .then((loaded) => {
        setSettings(loaded);
        initial.current = JSON.stringify(loaded);
      })
      .catch((err) =>
        setError(err instanceof AdminApiError ? err.message : 'Could not load settings.')
      )
      .finally(() => setLoading(false));
  }, []);

  const dirty =
    initial.current !== null && settings !== null && JSON.stringify(settings) !== initial.current;
  useUnsavedChangesGuard(dirty && !saving);

  function patch<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
    setSaved(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setError('');
    setFieldErrors({});

    // The validator requires both title and description on every value, but
    // "+ Add value" inserts a blank pair. Sending one would reject the entire
    // payload and lose every other edit on the page, so drop empty rows.
    const values = settings.values.filter(
      (v) => v.title.trim() || v.description.trim()
    );
    const incomplete = values.some((v) => !v.title.trim() || !v.description.trim());
    if (incomplete) {
      setError('Each value needs both a title and a description, or remove it.');
      toast({ tone: 'error', message: 'Settings could not be saved.' });
      setSaving(false);
      return;
    }

    try {
      const updated = await adminApi.patch<SiteSettings>('/api/admin/settings', {
        hero: settings.hero,
        heroSlides: (settings.heroSlides ?? []).filter((img) => img.url),
        notice: settings.notice,
        values,
        contact: settings.contact,
        socials: settings.socials,
        newsletter: settings.newsletter,
        video: settings.video ?? {},
        footerBlurb: settings.footerBlurb,
        seo: settings.seo,
        whatsappWidget: { ...settings.whatsappWidget, number: settings.whatsappWidget.number.trim() },
      });
      setSettings(updated);
      initial.current = JSON.stringify(updated);
      setSaved(true);
      toast({ message: 'Settings saved. The public site updates within moments.' });
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
        if (err.details) setFieldErrors(err.details);
      } else {
        setError('Could not save settings.');
      }
      toast({ tone: 'error', message: 'Settings could not be saved.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-cream-200" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-card bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <p role="alert" className="rounded-lg bg-maroon-600/10 px-4 py-3 text-sm text-maroon-700">
        {error || 'Settings are unavailable.'}
      </p>
    );
  }

  return (
    <div>
      <header className="mb-7">
        <h1 className="text-3xl">Site settings</h1>
        <p className="mt-2 text-sm text-muted">
          Everything here appears on the public site: the homepage hero and slides, the values, the
          contact block, the footer and its notice. The main menu has{' '}
          <Link href="/admin/settings/navigation" className="text-leaf-700 underline hover:text-leaf-500">
            its own screen
          </Link>
          .
        </p>
      </header>

      <div className="mb-5">
        <FormError message={error} fieldErrors={fieldErrors} />
      </div>
      {saved ? (
        <p role="status" className="mb-5 rounded-lg bg-leaf-100 px-4 py-3 text-sm text-leaf-700">
          Saved. The public site will reflect this within moments.
        </p>
      ) : null}

      {/* Two columns from xl up. The sections are independent, so they tile
          into a masonry-ish grid instead of one tall ribbon with a dead
          right-hand gutter. */}
      <form onSubmit={onSubmit} className="grid grid-cols-1 items-start gap-5 pb-4 xl:grid-cols-2">
        <FormSection
          className="xl:col-span-2"
          title="Homepage hero"
          description="The first thing every visitor sees."
        >
          <TextField
            label="Tag above the headline"
            name="heroEyebrow"
            value={settings.hero.eyebrow ?? ''}
            maxLength={80}
            error={fieldErrors['hero.eyebrow']}
            onChange={(v) => patch('hero', { ...settings.hero, eyebrow: v })}
          />
          <TextField
            label="Headline"
            name="heroTitle"
            value={settings.hero.title}
            maxLength={LIMITS.heroTitle}
            error={fieldErrors['hero.title']}
            onChange={(v) => patch('hero', { ...settings.hero, title: v })}
          />
          <TextArea
            label="Subheadline"
            name="heroSubtitle"
            value={settings.hero.subtitle}
            rows={2}
            maxLength={LIMITS.heroSubtitle}
            error={fieldErrors['hero.subtitle']}
            onChange={(v) => patch('hero', { ...settings.hero, subtitle: v })}
          />
          <div className="space-y-3">
            <p className="text-sm font-medium text-ink">Rotating background photographs</p>
            <p className="text-xs text-muted">Shown in this order. The first is the one search engines and slow connections see.</p>
            {(settings.heroSlides ?? []).map((slide, i) => (
              <div key={`${slide.url}-${i}`} className="rounded-lg border border-cream-200 bg-cream-50 p-3">
                <ImageUploader
                  label={`Slide ${i + 1}`}
                  value={slide.url ? slide : undefined}
                  onChange={(v) =>
                    patch(
                      'heroSlides',
                      v
                        ? settings.heroSlides.map((x, j) => (j === i ? v : x))
                        : settings.heroSlides.filter((_, j) => j !== i)
                    )
                  }
                />
              </div>
            ))}
            {(settings.heroSlides ?? []).length < 12 ? (
              <button
                type="button"
                onClick={() => patch('heroSlides', [...(settings.heroSlides ?? []), { url: '', alt: '' }])}
                className="w-full rounded-lg border border-dashed border-cream-300 py-2.5 text-sm text-leaf-700 hover:border-gold-500"
              >
                + Add slide
              </button>
            ) : null}
          </div>
          <ImageUploader
            label="Fallback background (used when there are no slides)"
            value={settings.hero.backgroundImage}
            onChange={(v) =>
              patch('hero', {
                ...settings.hero,
                backgroundImage: v ?? { url: '', alt: '' },
              })
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Primary button label"
              name="primaryLabel"
              value={settings.hero.primaryCta.label}
              maxLength={LIMITS.ctaLabel}
              error={fieldErrors['hero.primaryCta.label']}
              onChange={(v) =>
                patch('hero', {
                  ...settings.hero,
                  primaryCta: { ...settings.hero.primaryCta, label: v },
                })
              }
            />
            <TextField
              label="Primary button link"
              name="primaryHref"
              value={settings.hero.primaryCta.href}
              maxLength={LIMITS.ctaHref}
              error={fieldErrors['hero.primaryCta.href']}
              onChange={(v) =>
                patch('hero', {
                  ...settings.hero,
                  primaryCta: { ...settings.hero.primaryCta, href: v },
                })
              }
            />
            <TextField
              label="Secondary button label"
              name="secondaryLabel"
              value={settings.hero.secondaryCta.label}
              maxLength={LIMITS.ctaLabel}
              error={fieldErrors['hero.secondaryCta.label']}
              onChange={(v) =>
                patch('hero', {
                  ...settings.hero,
                  secondaryCta: { ...settings.hero.secondaryCta, label: v },
                })
              }
            />
            <TextField
              label="Secondary button link"
              name="secondaryHref"
              value={settings.hero.secondaryCta.href}
              maxLength={LIMITS.ctaHref}
              error={fieldErrors['hero.secondaryCta.href']}
              onChange={(v) =>
                patch('hero', {
                  ...settings.hero,
                  secondaryCta: { ...settings.hero.secondaryCta, href: v },
                })
              }
            />
          </div>
        </FormSection>

        <FormSection
          className="xl:col-span-2"
          title="Values"
          description="The four cards below the hero, and the panel on the About page."
        >
          {settings.values.map((value, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-cream-200 bg-cream-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted">Value {i + 1}</span>
                <button
                  type="button"
                  onClick={() =>
                    patch('values', settings.values.filter((_, j) => j !== i))
                  }
                  className="text-xs text-maroon-600 underline"
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                value={value.title}
                placeholder="Title"
                maxLength={LIMITS.valueTitle}
                aria-label={`Value ${i + 1} title`}
                onChange={(e) =>
                  patch(
                    'values',
                    settings.values.map((v, j) => (j === i ? { ...v, title: e.target.value } : v))
                  )
                }
                className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
              />
              <textarea
                rows={2}
                value={value.description}
                placeholder="Description"
                maxLength={LIMITS.valueDescription}
                aria-label={`Value ${i + 1} description`}
                onChange={(e) =>
                  patch(
                    'values',
                    settings.values.map((v, j) =>
                      j === i ? { ...v, description: e.target.value } : v
                    )
                  )
                }
                className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
              />
              {fieldErrors[`values.${i}.title`] || fieldErrors[`values.${i}.description`] ? (
                <p className="text-xs text-maroon-600">
                  {fieldErrors[`values.${i}.title`] ?? fieldErrors[`values.${i}.description`]}
                </p>
              ) : null}
              <select
                value={value.icon ?? 'compass'}
                onChange={(e) =>
                  patch(
                    'values',
                    settings.values.map((v, j) => (j === i ? { ...v, icon: e.target.value } : v))
                  )
                }
                className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
              >
                {['compass', 'clock', 'leaf', 'receipt'].map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
              <ImageUploader
                label="Photograph (homepage)"
                value={value.image?.url ? value.image : undefined}
                onChange={(v) =>
                  patch(
                    'values',
                    settings.values.map((x, j) => (j === i ? { ...x, image: v ?? null } : x))
                  )
                }
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              patch('values', [
                ...settings.values,
                { title: '', description: '', icon: 'compass' },
              ])
            }
            className="w-full rounded-lg border border-dashed border-cream-300 py-2.5 text-sm text-leaf-700 hover:border-gold-500"
          >
            + Add value
          </button>
        </FormSection>

        <FormSection title="Contact details" description="Used in the header, footer and contact page. Both numbers are shown publicly when they differ.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Phone"
              name="phone"
              hint="Primary number. Shown first everywhere."
              value={settings.contact.phone}
              maxLength={LIMITS.phone}
              error={fieldErrors['contact.phone']}
              onChange={(v) => patch('contact', { ...settings.contact, phone: v })}
            />
            <TextField
              label="WhatsApp"
              name="whatsapp"
              hint="Also listed as a second number, and used for WhatsApp links. Leave blank to show only the phone number."
              value={settings.contact.whatsapp ?? ''}
              maxLength={LIMITS.phone}
              error={fieldErrors['contact.whatsapp']}
              onChange={(v) => patch('contact', { ...settings.contact, whatsapp: v })}
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              value={settings.contact.email}
              maxLength={LIMITS.email}
              error={fieldErrors['contact.email']}
              onChange={(v) => patch('contact', { ...settings.contact, email: v })}
            />
            <TextField
              label="Support hours"
              name="supportHours"
              value={settings.contact.supportHours}
              maxLength={LIMITS.supportHours}
              error={fieldErrors['contact.supportHours']}
              onChange={(v) => patch('contact', { ...settings.contact, supportHours: v })}
            />
            <TextField
              label="Address line"
              name="addressLine"
              value={settings.contact.addressLine ?? ''}
              maxLength={LIMITS.addressLine}
              error={fieldErrors['contact.addressLine']}
              onChange={(v) => patch('contact', { ...settings.contact, addressLine: v })}
            />
            <TextField
              label="P.O. Box"
              name="poBox"
              value={settings.contact.poBox ?? ''}
              maxLength={LIMITS.poBox}
              error={fieldErrors['contact.poBox']}
              onChange={(v) => patch('contact', { ...settings.contact, poBox: v })}
            />
            <TextField
              label="City"
              name="city"
              value={settings.contact.city}
              maxLength={LIMITS.city}
              error={fieldErrors['contact.city']}
              onChange={(v) => patch('contact', { ...settings.contact, city: v })}
            />
          </div>
        </FormSection>

        <FormSection
          title="WhatsApp chat"
          description="The green chat button in the corner of every public page, and the “Chat on WhatsApp” buttons on tour and destination pages."
        >
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.whatsappWidget.enabled}
              onChange={(e) => patch('whatsappWidget', { ...settings.whatsappWidget, enabled: e.target.checked })}
              className="h-4 w-4 accent-gold-500"
            />
            Show WhatsApp chat on the site
          </label>
          <TextField
            label="Chat number"
            name="whatsappWidget.number"
            placeholder={settings.contact.whatsapp || settings.contact.phone}
            hint={`Leave blank to use the WhatsApp number above, or the phone number if that is blank. Chats currently go to ${
              whatsappNumber({ contact: settings.contact, whatsappWidget: { ...settings.whatsappWidget, enabled: true } }) ??
              'no valid number'
            }.`}
            value={settings.whatsappWidget.number}
            maxLength={LIMITS.phone}
            error={fieldErrors['whatsappWidget.number']}
            onChange={(v) => patch('whatsappWidget', { ...settings.whatsappWidget, number: v })}
          />
          <TextArea
            label="Greeting"
            name="whatsappWidget.greeting"
            rows={2}
            value={settings.whatsappWidget.greeting}
            maxLength={300}
            error={fieldErrors['whatsappWidget.greeting']}
            onChange={(v) => patch('whatsappWidget', { ...settings.whatsappWidget, greeting: v })}
          />
          <ListField
            label="Quick questions"
            value={settings.whatsappWidget.quickReplies}
            hint="One per line, up to six. Tapping one fills in the visitor's message."
            onChange={(v) => patch('whatsappWidget', { ...settings.whatsappWidget, quickReplies: v.slice(0, 6) })}
          />
        </FormSection>

        <FormSection title="Social links" description="Leave blank to hide a platform from the footer.">
          <div className="grid gap-4 sm:grid-cols-2">
            {(['facebook', 'instagram', 'x', 'youtube', 'tiktok'] as const).map((key) => (
              <TextField
                key={key}
                label={key === 'x' ? 'X (Twitter)' : key[0].toUpperCase() + key.slice(1)}
                name={key}
                value={settings.socials[key] ?? ''}
                placeholder="https://…"
                maxLength={LIMITS.social}
                error={fieldErrors[`socials.${key}`]}
                onChange={(v) => patch('socials', { ...settings.socials, [key]: v })}
              />
            ))}
          </div>
        </FormSection>

        <FormSection title="Footer and newsletter">
          <TextArea
            label="Footer description"
            name="footerBlurb"
            value={settings.footerBlurb}
            rows={3}
            maxLength={LIMITS.footerBlurb}
            error={fieldErrors.footerBlurb}
            onChange={(v) => patch('footerBlurb', v)}
          />
          <TextField
            label="Newsletter heading"
            name="newsletterHeading"
            value={settings.newsletter.heading}
            maxLength={LIMITS.newsletterHeading}
            error={fieldErrors['newsletter.heading']}
            onChange={(v) => patch('newsletter', { ...settings.newsletter, heading: v })}
          />
          <TextArea
            label="Newsletter blurb"
            name="newsletterBlurb"
            value={settings.newsletter.blurb}
            rows={2}
            maxLength={LIMITS.newsletterBlurb}
            error={fieldErrors['newsletter.blurb']}
            onChange={(v) => patch('newsletter', { ...settings.newsletter, blurb: v })}
          />
        </FormSection>

        <FormSection
          title="Homepage film"
          description="The video embedded on the homepage. Leave blank to show the placeholder."
        >
          <TextField
            label="YouTube video ID"
            name="videoYoutubeId"
            value={settings.video?.youtubeId ?? ''}
            maxLength={LIMITS.youtubeId}
            error={fieldErrors['video.youtubeId']}
            hint="The 11-character ID, e.g. dQw4w9WgXcQ. Pasting a full YouTube link also works."
            onChange={(v) => patch('video', { youtubeId: extractYoutubeId(v) })}
          />
        </FormSection>

        <FormSection
          title="Site notice"
          description="A line in the footer on every page. The original site said its content and prices were placeholders; keep this on until real prices and contact details are confirmed."
        >
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.notice?.enabled ?? false}
              onChange={(e) => patch('notice', { ...settings.notice, enabled: e.target.checked })}
              className="h-4 w-4 accent-gold-500"
            />
            Show the notice
          </label>
          <TextField
            label="Notice text"
            name="noticeText"
            value={settings.notice?.text ?? ''}
            maxLength={200}
            error={fieldErrors['notice.text']}
            onChange={(v) => patch('notice', { ...settings.notice, text: v })}
          />
        </FormSection>

        <FormSection title="Default SEO" description="Used where a page does not set its own.">
          <TextField
            label="Default title"
            name="seoTitle"
            value={settings.seo.defaultTitle}
            maxLength={LIMITS.seoTitle}
            error={fieldErrors['seo.defaultTitle']}
            onChange={(v) => patch('seo', { ...settings.seo, defaultTitle: v })}
          />
          <TextArea
            label="Default description"
            name="seoDescription"
            value={settings.seo.defaultDescription}
            rows={2}
            maxLength={LIMITS.seoDescription}
            error={fieldErrors['seo.defaultDescription']}
            onChange={(v) => patch('seo', { ...settings.seo, defaultDescription: v })}
          />
        </FormSection>

        <div className="xl:col-span-2">
          <FormActions saving={saving} submitLabel="Save settings" dirty={dirty} />
        </div>
      </form>
    </div>
  );
}
