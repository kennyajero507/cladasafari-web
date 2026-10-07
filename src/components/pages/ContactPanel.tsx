import { ContactForm } from '@/components/contact/ContactForm';
import { SocialIcon, activeSocials } from '@/components/ui/SocialIcon';
import { telHref, whatsappHref } from '@/lib/format';
import type { ContactOffice, PageContact } from '@/types';

const label = 'mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-gold-400';
const link = 'text-white transition-colors hover:text-gold-400';

function mapHref(office: ContactOffice): string {
  return office.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(office.lines.join(', '))}`;
}

/**
 * The enquiry form beside every way of reaching the team: phones (with
 * WhatsApp where flagged), emails, offices and socials. The details are the
 * contact page's own, with Site settings filling anything it leaves blank,
 * so this always has at least what the footer shows.
 */
export function ContactPanel({
  details,
  interests,
  defaultInterest,
}: {
  details: PageContact;
  interests: string[];
  defaultInterest?: string;
}) {
  const socials = activeSocials(details.socials);
  const whatsapp = details.phones.find((p) => p.whatsapp);

  const card = (
    <div className="rounded-[3px] bg-charcoal-900 p-7 text-cream-100">
      <h2 className="mb-1 text-xl text-white">Get in touch</h2>
      {details.hours ? <p className="mb-6 text-sm text-[#a9a394]">{details.hours.replace(/\.$/, '')}.</p> : <div className="mb-6" />}

      <dl className="space-y-5 text-sm">
        {details.phones.length ? (
          <div>
            <dt className={label}>{details.phones.length === 1 ? 'Phone' : 'Phones'}</dt>
            <dd className="space-y-1.5">
              {details.phones.map((phone) => (
                <p key={phone.number}>
                  <a href={`tel:${telHref(phone.number)}`} className={link}>
                    {phone.number}
                  </a>
                  {phone.label && !['Phone', 'WhatsApp'].includes(phone.label) ? (
                    <span className="ml-2 text-xs text-[#a9a394]">{phone.label}</span>
                  ) : null}
                </p>
              ))}
            </dd>
          </div>
        ) : null}

        {details.emails.length ? (
          <div>
            <dt className={label}>Email</dt>
            <dd className="space-y-1.5">
              {details.emails.map((email) => (
                <p key={email.address}>
                  <a href={`mailto:${email.address}`} className={`break-all ${link}`}>
                    {email.address}
                  </a>
                  {email.label && email.label !== 'Email' ? (
                    <span className="block text-xs text-[#a9a394]">{email.label}</span>
                  ) : null}
                </p>
              ))}
            </dd>
          </div>
        ) : null}

        {details.offices.map((office) => (
          <div key={office.name}>
            <dt className={label}>{office.name}</dt>
            <dd>
              <address className="not-italic text-cream-200">
                {office.lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
              {office.hours ? <p className="mt-1 text-xs text-[#a9a394]">{office.hours}</p> : null}
              {office.lines.length || office.mapUrl ? (
                <a
                  href={mapHref(office)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-gold-400 transition-colors hover:text-gold-300"
                >
                  Open in Google Maps <span aria-hidden>→</span>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      {socials.length ? (
        <div className="mt-6 flex flex-wrap gap-2" aria-label="Social media">
          {socials.map((s) => (
            <a
              key={s.key}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 transition-colors hover:border-gold-500 hover:text-gold-400"
            >
              <SocialIcon name={s.key} />
            </a>
          ))}
        </div>
      ) : null}

      {whatsapp ? (
        <a
          href={whatsappHref(whatsapp.number)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 flex h-11 w-full items-center justify-center rounded-[3px] bg-[#25D366] text-sm font-medium text-white transition-colors hover:bg-[#1ebe5a]"
        >
          Message us on WhatsApp
        </a>
      ) : null}
    </div>
  );

  return (
    <section className="bg-cream-100 py-16 md:py-20">
      {details.showForm ? (
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            {details.formHeading ? <h2 className="mb-6 text-2xl">{details.formHeading}</h2> : null}
            <ContactForm interests={interests} defaultInterest={defaultInterest} />
          </div>
          <aside>{card}</aside>
        </div>
      ) : (
        <div className="container-page max-w-xl">{card}</div>
      )}
    </section>
  );
}
