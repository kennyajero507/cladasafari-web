# Clada Safari Bliss: web

The public website and `/admin` dashboard for cladasafaribliss.com (Next.js 15, App Router,
React 19, Tailwind CSS v4, TypeScript). It reads everything from the Django API in the separate
**cladasafari-api** repo; start that first. Its README covers the content inventory and
architecture.

Requirements: Node 20+.

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3001, API expected on http://localhost:8001
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | The API's base URL as browsers reach it, without `/api` |
| `API_INTERNAL_URL` | Optional: the API as the Next.js server reaches it. Also proxied at `/backend/*` |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, for metadata and the sitemap |
| `REVALIDATE_SECRET` | Must equal the API's; lets admin saves refresh public pages |
| `NEXT_PUBLIC_TAWK_SRC` | Optional Tawk.to embed URL, which enables live chat |

The admin area is linked from nowhere on the public site, is `noindex`, and is disallowed in
`robots.txt`.

## Checks

```bash
npm run lint && npx tsc --noEmit && npm run build
```

CI (`.github/workflows/ci.yml`) runs the same. The build passes without a running API.

## What the site shows

- **Menu.** The Clada Safari Bliss menu, unchanged: Home, Local, Getaways, International and
  Safari Packages (each with its places), Air Ticketing, About Us, Contact Us. The four groups
  and their places come from the API's category tree (`src/lib/navigation.ts`), so the menu
  follows the catalogue. It can be rearranged at `/admin/settings/navigation`.
- **Homepage.** One section per group, each a single grid of that group's packages
  (`src/components/home/CategorySection.tsx`). There is no sub-heading per place or country.
- **Footer.** "Explore" lists the top-level groups only.
- **Packages.** A price of 0 prints as "Price on request", and a package with no stated length
  or group size shows neither.
- **Old addresses.** `/tour/<slug>`, `/ba_locations/<slug>`, `/about-us`, `/contact-us` and
  `/faqs-page` from the previous WordPress site redirect to their new pages (`next.config.ts`).

## Images and logo

- `public/images/` holds 100 photographs copied from cladasafaribliss.com: three from its
  homepage slider and the rest from its package galleries. Every one is registered in the API's
  media library (`ImageAsset`) and listed in `public/images/CREDITS.md`.
- **Their rights are unconfirmed.** The previous site records no photographer or licence. Three
  file names point at Pexels. Confirm each before launch, or replace it in the dashboard.
- **The gallery photographs are 400 × 550 px**, which is what the previous site holds. They are
  sharp on cards and in galleries. A package banner would stretch them, so it shows a blurred
  wash of the photograph with the photograph itself beside the title
  (`src/components/tours/TourBanner.tsx`). Upload a banner-sized image (1000 px wide or more)
  for a package and it is used full-width instead.
- `public/brand/logo.png` is the previous site's logo with its white background removed;
  `logo-mark.png` is its square icon, also the favicon (`src/app/icon.png`).

Uploads made in the dashboard are served by the API. `next.config.ts` allows them from
`localhost:8001`, `localhost:8000` and the production domains, at both `/uploads/**` and
`/api/uploads/**`.

## Deploying to cPanel / DirectAdmin (CloudLinux)

The site runs as a Node.js app under Phusion Passenger, started from `server.js`.

1. Upload the repo (without `node_modules` and `.next`) to the app's folder.
2. In **Setup Node.js App**: Node 20 or newer, the folder as application root, `server.js` as
   startup file, mode production.
3. Create `.env.local` in that folder with the production values (see `.env.example`).
4. Over SSH, in that folder:

   ```bash
   chmod +x deploy.sh
   ./deploy.sh                  # install, build, restart
   ./deploy.sh --skip-install   # later builds with unchanged dependencies
   ```

`deploy.sh` exists because of CloudLinux's per-account limits on processes and memory. A plain
`next build` starts a worker per CPU core and is killed part-way. The script builds with one
worker and no worker threads (`BUILD_SINGLE_THREAD=1`, read by `next.config.ts`), caps the heap
(`BUILD_MEMORY_MB`, default 1024), and restarts Passenger by touching `tmp/restart.txt`. If the
build is still killed, lower `BUILD_MEMORY_MB` to 768, or build on another machine and upload
`.next`.

`NEXT_PUBLIC_*` values are compiled in, so rebuild after changing them.

### Where the API lives

| Layout | `NEXT_PUBLIC_API_URL` | API's `PUBLIC_API_URL` | API's `REVALIDATE_URL` |
|---|---|---|---|
| API on `api.cladasafaribliss.com` | `https://api.cladasafaribliss.com` | the same | default |
| API mounted at `/api` on the site's domain | `https://cladasafaribliss.com` | `https://cladasafaribliss.com/api` | `https://cladasafaribliss.com/hooks/revalidate` |

In the second layout every `/api/*` request goes to Django, including the revalidation hook this
app normally answers at `/api/revalidate`. `/hooks/revalidate` is the same hook at an address
Django does not own.

With the API on its own subdomain, set the API's `COOKIE_DOMAIN=.cladasafaribliss.com` so the
dashboard's sign-in cookie is visible to this app.
