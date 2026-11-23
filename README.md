# DANY — Fashion e-commerce (manual payment)

A mobile-first fashion store built with **Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui, Framer Motion, Prisma 7 and PostgreSQL 17**.

Customers browse, choose size and colour, build a cart and place an order **without online payment**. The order is saved in PostgreSQL. The customer then sends it to the seller through **Telegram, WhatsApp or Messenger**. The seller confirms availability, arranges payment and records it manually in the admin dashboard.

> Nothing in the system takes payment, and nothing marks an order as confirmed or paid unless an authorised admin does it.

---

## Contents

1. [Features](#features)
2. [Quick start (development)](#quick-start-development)
3. [Environment variables](#environment-variables)
4. [Scripts](#scripts)
5. [Architecture](#architecture)
6. [Order, payment and inventory flow](#order-payment-and-inventory-flow)
7. [Testing](#testing)
8. [Deployment (AWS EC2)](#deployment-aws-ec2)
9. [Backups and restore](#backups-and-restore)
10. [Security](#security)
11. [Known limitations and next steps](#known-limitations-and-next-steps)

---

## Features

### Storefront (English and Khmer, mobile-first)
- **Homepage.** Hero carousel, shop-by-category tiles, new arrivals, promo banner, best sellers, featured collections, trending, special offers, a lookbook, newsletter sign-up and a social gallery. Every section's content, order and visibility is managed in the admin.
- **Navigation.**
  - Sticky header with a mega-menu.
  - Mobile slide-in menu and fixed bottom navigation.
  - Search overlay with debounced suggestions and recent searches.
  - Animated cart count.
- **Catalogue.**
  - Category, collection, shop and search listings.
  - Real database filters: subcategory, size, colour, price range, brand, availability, sale and new arrivals.
  - Sorting by newest, price, popularity and best selling.
  - Pagination, a filter drawer on mobile, and empty states.
- **Product pages.**
  - Gallery with swiping on mobile and zoom and a lightbox on desktop.
  - Colour-linked images.
  - Size and colour validation: nothing is pre-selected unless it is the only option.
  - Live stock status, quantity selector, size guide, Order Now, wishlist, related and recently viewed products, and JSON-LD.
- **Cart.**
  - Slide-in drawer and a full cart page.
  - Quantity changes, remove and clear.
  - Instant subtotal, with server-validated coupons, delivery fee and tax.
  - The cart persists in localStorage and merges into the account at login.
- **Checkout.**
  - Contact details, address and delivery method.
  - The customer chooses how they will contact the seller.
  - The server recalculates all prices, checks stock and reserves it in a transaction, then saves the order as **PENDING** with an `ORD-YYYY-NNNNN` number.
- **Order confirmation.**
  - Deep links to Telegram (`t.me/…?text=`) and WhatsApp (`wa.me/…?text=`) containing the full order text.
  - Messenger opens after the order details are copied to the clipboard.
  - A copy-to-clipboard fallback and a status timeline.
  - The page states that the order is not confirmed yet.
- **Accounts (optional; guest checkout works).** Register, sign in, profile, password change, address book, order history and a synced wishlist.

### Admin (`/admin`)
- **Dashboard.** Paid sales, order counts by state, customers, products and low stock. Daily order-value chart and status chart, recent orders and best sellers. All figures are computed from live data.
- **Orders.**
  - Search and filter by order number, status, date and customer.
  - Detail page with customer contact shortcuts and the stock movement history.
  - Status workflow with guarded transitions, manual payment recording, cancellation, internal notes and tracking number.
  - Printable invoice and CSV export.
- **Products.** Create, edit, archive and delete. Multiple images (upload, reorder, featured image, linked colour), a variant matrix (per-variant SKU, price override, stock, active flag), sale price, flags, tags, collections and a Khmer translation.
- **Categories.** Two levels, with reorder, activate/deactivate, images, banners and Khmer names.
- **Inventory.** Totals, low-stock, out-of-stock and reserved filters, reason-required adjustments, and a full movement history.
- **Customers.** Order count, lifetime value and last order date, plus each customer's order history.
- **Promotions.**
  - Coupons: percentage or fixed amount; scope of all products, categories or specific products; minimum order; maximum discount; start and end dates; usage limits.
  - Automatic promotions shown as sale prices.
- **Content.** Hero, promotional and editorial banners with scheduling and Khmer text, and collections.
- **Settings.**
  - Store name, logo and favicon; currency (USD or KHR) with a fixed KHR rate.
  - Messaging channels and the default channel.
  - Minimum order and tax.
  - Inventory policy (reservation hours, when stock is deducted, low-stock threshold).
  - Contact and social links, announcement bar, homepage sections, social gallery, shipping info, size guide, delivery methods, sizes and colours.
- **Activity log.** Records sign-ins and every sensitive admin change.
- **Roles.** `ADMIN` has full access. `STAFF` can work with orders, inventory, customers and products (view only). This is enforced on the server.

---

## Quick start (development)

Requirements: **Node.js 22+**, **Docker**.

```bash
cp .env.example .env            # then edit values (see below)
docker compose up -d db         # PostgreSQL 17 on 127.0.0.1:${POSTGRES_PORT}
npm install                     # also runs `prisma generate`
npm run db:migrate              # apply migrations
npm run db:seed                 # reference data + demo catalogue (demo is skipped in production)
npm run dev                     # http://localhost:3000
```

- Storefront: <http://localhost:3000>
- Admin: <http://localhost:3000/admin>. The first admin comes from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
- The development seed also creates `staff@dany.local` / `Staff@12345` and `customer@dany.local` / `Customer@123`, plus the coupons `WELCOME10`, `SUMMER5` and `EXPIRED20` (expired, for testing).

> **Windows note:** if port 5432 is reserved, set `POSTGRES_PORT=5433` and use that port in `DATABASE_URL`.

Demo product photos come from Unsplash and are for development only. Upload your own images through the admin before launch.

---

## Environment variables

All variables are documented in [`.env.example`](.env.example). The most important:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. In Docker it is built from the `POSTGRES_*` variables. |
| `DATABASE_URL_TEST` | **Separate** database for integration tests. The tests wipe it. |
| `APP_URL` | Public base URL. Used for order links, the sitemap and the CSRF origin check. |
| `SESSION_SECRET` | At least 32 random characters. |
| `CRON_SECRET` | Bearer token for `/api/cron/release-reservations`. |
| `TRUST_PROXY` | `true` behind the bundled Nginx, so client IPs come from `X-Forwarded-For`. |
| `STORAGE_DRIVER` | `local` (volume on the VPS) or `cloudinary` (also needs `CLOUDINARY_*`). |
| `UPLOAD_DIR`, `UPLOAD_MAX_MB` | Where local uploads are written, and the size limit. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | The first admin account, created by `npm run db:seed`. |
| `DOMAIN`, `BACKUP_KEEP_DAYS`, `BACKUP_HOUR` | Production compose settings. |
| `DISABLE_RATE_LIMIT` | Local and E2E testing only. Ignored when `NODE_ENV=production`. |

Secrets are only read on the server (`src/lib/env.ts`, `server-only` modules), and none use the `NEXT_PUBLIC_` prefix.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development server, production build, production start |
| `npm run lint` / `typecheck` | ESLint, `tsc --noEmit` |
| `npm run db:migrate` | Create and apply migrations in development (`prisma migrate dev`) |
| `npm run db:deploy` | Apply migrations in production (`prisma migrate deploy`) |
| `npm run db:seed` | Seed reference data, plus the demo catalogue outside production |
| `npm run db:studio` | Prisma Studio |
| `npm test` | Unit and integration tests (Vitest) |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Migrate the test DB, then run the integration tests |
| `npm run test:e2e` | Playwright end-to-end tests (desktop and mobile) |

---

## Architecture

```text
src/
  app/
    (store)/            storefront routes (home, shop, categories, collections, products,
                        search, cart, checkout, orders, wishlist, account, help)
    admin/              /admin/login + (panel)/… dashboard, orders, products, categories,
                        inventory, customers, promotions, content, collections, settings, activity
    api/                REST route handlers (public, customers, admin, cron)
    uploads/[...path]   serves locally stored images
    sitemap.ts, robots.ts
  components/           UI by area (layout, home, products, shop, cart, checkout, account, admin, shared, ui)
  features/             client state providers (cart, wishlist, session, store) and pure feature logic
  services/             server-side business logic (catalog, cart pricing, orders, inventory, admin…)
  lib/                  prisma, env, api helpers, auth, permissions, security, storage, money,
                        calculations (pure pricing engine), messaging (order text + deep links), validations (Zod)
  i18n/                 typed EN/KM dictionaries, server + client translators
  proxy.ts              optimistic route protection (Next 16 "proxy", formerly middleware)
prisma/                 schema, migrations, seed
tests/                  unit/, integration/, e2e/
deploy/                 nginx templates, Let's Encrypt bootstrap, backup/restore scripts
```

### Key decisions
- **Money:** stored as `DECIMAL(12,2)`. All arithmetic is in integer cents (`src/lib/money.ts`), with no floats. Every order stores its currency.
- **One pricing engine:** `src/lib/calculations/pricing.ts` is pure, with no database or framework imports.
  - The browser uses it for instant subtotals.
  - The server re-runs it with fresh database data (`services/cart.ts`) for quotes and orders.
  - Client-sent prices are never used.
- **Promotions:** the single best active promotion applies per product. Coupons apply to the order, can be scoped to categories or products, and are validated on the server.
- **Sessions:** a database-backed session with an httpOnly SameSite=Lax cookie. Only a SHA-256 hash of the token is stored. Passwords are hashed with bcrypt (cost 12).
- **Rendering:** Next 16 without Cache Components. Pages are server-rendered on demand because they read the language, session and live stock. Listings are paginated and indexed (`sortPrice`, status, flags, GIN index on tags).
- **i18n:** cookie-based locale (`en`/`km`) with typed dictionaries, plus DB translation tables for products and categories and JSON translations for banners, collections, delivery methods and settings. Adding a language means a new dictionary file and an entry in `LOCALES`.
  - Visitors switch with the **EN / ខ្មែរ** toggle in the header (also in the footer and mobile menu). The choice is stored in a cookie.
  - Admin-editable Khmer fields: products (name, short description, description), categories, collections, banners, delivery methods (name, estimated time), colours and sizes (Settings → Sizes & colours), and store text (tagline, announcement, footer, address, shipping info, size guide). Empty Khmer fields fall back to English.
  - Khmer pages switch off letter-spacing (it breaks stacked Khmer characters). Prices use the same `$55.00` / `41,000៛` format in both languages.
  - Orders store canonical (base-language) names, so invoices, CSV exports and seller messages stay consistent.
- **Images:** a storage driver abstraction. Uploads are checked by magic bytes (JPEG, PNG, WebP, AVIF; SVG is refused), size-limited and given random file names. With the `local` driver, files live on a Docker volume that Nginx serves.

---

## Order, payment and inventory flow

```text
Checkout ──► POST /api/orders (one DB transaction)
               • re-price every line from the DB, validate coupon, delivery, minimum order
               • reserve stock with conditional UPDATE … WHERE stock - reserved >= qty  (no overselling)
               • claim one coupon use atomically, allocate ORD-YYYY-NNNNN
               • save order + immutable item snapshots, status PENDING, payment UNPAID
          ──► confirmation page: Telegram / WhatsApp deep link, Messenger + copy
               (opening an app ⇒ AWAITING_SELLER_CONFIRMATION; never "confirmed")
Admin    ──► CONFIRMED → AWAITING_PAYMENT → PAYMENT_RECEIVED (manual, with note) → PREPARING → SHIPPED → COMPLETED
               any open state → CANCELLED
```

- **Reservation window:** set by `reservationHours` in Settings. Expired reservations are released every 15 minutes by the scheduler (and also when admins open the order list). The order stays open; confirming it later re-reserves stock if it is still available.
- **Permanent deduction:** happens at the status chosen in Settings (`deductStockOn`: Confirmed, Payment received or Shipped).
- **Cancellation:** releases a reservation, or restocks deducted units. It also returns the coupon use and corrects best-seller counts.
- **Audit trail:** every change is written to `InventoryMovement`, and manual adjustments require a reason. Status changes go to `OrderStatusHistory`, and sensitive admin actions to `AdminActivityLog`.
- **Receipt PDF:** `GET /api/orders/{orderNumber}/receipt` (same access rule as the order page: guest token, the owning customer, or staff; `download=1` saves the file, otherwise it opens inline for printing; `lang=en|km`). The confirmation page and the admin order page link to it. It is rendered server-side with `@react-pdf/renderer` and the Battambang font (`assets/fonts`, OFL), which covers Khmer and Latin. Totals come from the order snapshot. Until payment is recorded, the PDF states that it is an order summary, not proof of payment.

---

## Performance and the installable app (PWA)

**Server caching.** Store settings, the category tree, promotions, banners, collections and delivery methods are cached across requests (`src/lib/shared-cache.ts`, Next.js `unstable_cache`). Before, every page re-read all of them, which meant 19–39 database queries per page; it is now 10–26, and 0 for the bag. Every successful admin save clears this cache, so changes show on the next page load. Entries also expire after 5 minutes, which covers edits made outside the admin. Stock, prices at checkout and anything per-user are never cached. To profile queries, set `PRISMA_LOG_QUERIES=true` to log every query.

**Images.** WebP only (AVIF takes about 50% longer to encode on a small server). Optimized images are kept for 30 days in the `next-cache` Docker volume, so they survive deploys.

**Why Redis or WebSockets are not used.** The site runs as a single server, where Next's own cache does the same job as Redis without another service to run. WebSockets push live updates; they do not make pages load faster.

**Server location matters most.** Every request makes several round trips between the phone and the server. Sydney (ap-southeast-2) is about 235 ms per round trip from Cambodia; Singapore (ap-southeast-1) is typically 30–50 ms.

**Installable app (PWA).**
- `src/app/manifest.ts` provides the name, the icons in `public/brand/pwa-*` and shortcuts.
- `public/sw.js` is the service worker. It caches versioned JS/CSS and images on the phone, so repeat visits load almost nothing from the network. It never caches pages, `/api` or `/admin`. Without a connection it shows `public/offline.html`.
- **Install prompt:** shoppers see a dismissible card. Android and Chrome get the native install dialog; iPhone users get step-by-step Safari instructions. There is also an "Install app" link in the menu and footer.
- **Updating:** after changing caching rules, bump `VERSION` in `sw.js` so phones drop their old caches.

---

## Testing

```bash
npm run test:unit          # pricing, money, coupons, delivery/tax, variant validation, messaging, CSV
npm run test:integration   # real PostgreSQL (DATABASE_URL_TEST): orders, stock race, rollback,
                           # coupon limits, status/inventory lifecycle, reservation expiry,
                           # public API, admin authorisation
npm run test:e2e           # Playwright, desktop + mobile: full customer journey → order in PostgreSQL →
                           # Telegram link contents → admin login → confirm → update status
```

End-to-end tests expect a seeded database (`npm run db:seed`) and reuse a running dev server. If none is running, they start one with `DISABLE_RATE_LIMIT=true`. To test a deployed build, set `E2E_BASE_URL` (and `E2E_DATABASE_URL`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`).

---

## Deployment (AWS EC2)

Production: **https://dany-meas.store** on EC2 `3.27.91.153` (ap-southeast-2, Sydney). The production stack runs on Docker Compose (`--profile prod`) and has these services:

| Service | Role |
| --- | --- |
| `db` | PostgreSQL 17, bound to localhost only |
| `migrate` | One-off job: `prisma migrate deploy` plus the reference-data seed |
| `app` | Next.js standalone server, non-root, with a health check |
| `nginx` | TLS, HTTP/2, HSTS, gzip and API rate limiting; serves `/uploads` directly from the volume |
| `certbot` | Renews Let's Encrypt certificates |
| `scheduler` | Releases expired stock reservations every 15 minutes |
| `backup` | Nightly `pg_dump` plus an uploads archive, with rotation |

Everything AWS-specific lives in [`deploy/aws/`](deploy/aws/):

| File | Where it runs | What it does |
| --- | --- | --- |
| `bootstrap-ec2.sh` | server, once | Docker, swap (the build needs it), log rotation, security updates, cron jobs |
| `push.sh` | your computer | Uploads the project over SSH (no git remote needed), optionally deploys |
| `deploy.sh` | server | Checks `.env`, builds, migrates, issues HTTPS on first run, verifies health |
| `env.production.example` | server | `.env` template, pre-filled for `dany-meas.store` |
| `backup-to-s3.sh` + `iam-backup-policy.json` | server (cron) | Optional off-server copies of backups to S3 |

### 1. AWS console (once)

1. **Instance:** Ubuntu 24.04 LTS, **t3.small or larger** (2 GB RAM; with the swap from step 3 the image builds fine), 30 GB gp3 disk.
2. **Elastic IP:** make sure `3.27.91.153` is an *Elastic IP* associated with the instance. A plain auto-assigned public IP changes when the instance stops, and the site would go offline.
3. **Security group, inbound:** `22` from *your IP only*, `80` and `443` from `0.0.0.0/0` (and `::/0`). Postgres is never exposed.
4. **DNS** at your domain registrar: `A` record `dany-meas.store` → `3.27.91.153`, and `A` record `www` → `3.27.91.153`. Check with `nslookup dany-meas.store` before step 5; HTTPS cannot be issued until it resolves.
5. Optional: an S3 bucket for backups, plus an IAM role for the instance using `deploy/aws/iam-backup-policy.json` (replace the bucket name). Add a lifecycle rule to the bucket to expire old backups, for example after 90 days.

### 2. Upload the code (from your computer)

In Git Bash, from the project root:

```bash
EC2_KEY=~/.ssh/dany-shop.pem ./deploy/aws/push.sh
```

The upload excludes `.env`, `node_modules`, build output, uploads and backups. It never overwrites the server's `.env` or `backups/`.

### 3. Prepare the server (once)

```bash
ssh -i ~/.ssh/dany-shop.pem ubuntu@3.27.91.153
bash /opt/dany-shop/deploy/aws/bootstrap-ec2.sh
exit        # log in again so the docker group applies
```

### 4. Configure

```bash
ssh -i ~/.ssh/dany-shop.pem ubuntu@3.27.91.153
cd /opt/dany-shop
cp deploy/aws/env.production.example .env
openssl rand -hex 24; openssl rand -hex 32; openssl rand -hex 24    # POSTGRES_PASSWORD, SESSION_SECRET, CRON_SECRET
nano .env      # also LETSENCRYPT_EMAIL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
chmod 600 .env
```

### 5. Deploy

```bash
bash deploy/aws/deploy.sh
```

On the first run this builds the images, migrates, seeds the reference data (categories, Siem Reap delivery methods, settings and the admin account; never the demo catalogue), obtains the Let's Encrypt certificate and starts everything. It stops with a clear message if `.env` is incomplete or DNS does not point at the server yet. In that case, fix the problem and run it again.

### 6. After go-live

- Sign in at `https://dany-meas.store/admin` and change the admin password. Set the Telegram, WhatsApp and Messenger accounts in **Settings**.
- Add products: the full editor is under **Products → New product**. Use **Quick edit** on the product list for price, sale, status, flags and stock.
- Place a test order on your phone, download the receipt PDF, then cancel the order in the admin.

### Updating

From your computer, upload and redeploy in one step (migrations run before the new app starts):

```bash
EC2_KEY=~/.ssh/dany-shop.pem ./deploy/aws/push.sh --deploy
```

**Useful commands on the server**, run from `/opt/dany-shop`:

- `docker compose --profile prod ps` shows the service status.
- `docker compose --profile prod logs -f --tail=100 app` follows the app logs.

**Certificates:** `certbot` renews them automatically, and a weekly cron job installed by `bootstrap-ec2.sh` reloads Nginx to pick them up.

---

## Backups and restore

The `backup` service writes to `./backups/` on the host:

- `db-YYYYMMDD-HHMMSS.dump`: a compressed `pg_dump` in custom format.
- `uploads-YYYYMMDD-HHMMSS.tar.gz`: uploaded images, when the local driver is used.

It runs once on start and then daily at `BACKUP_HOUR`, and deletes files older than `BACKUP_KEEP_DAYS`. **Copy `./backups` off the server** with your own tool, such as `deploy/aws/backup-to-s3.sh` (S3), `rclone` or `restic`. Backups that stay on the same VPS do not protect you against losing that server.

**Restore** (this stops the app, replaces the database and optionally the images, then restarts):

```bash
./deploy/backup/restore.sh backups/db-20261122-030000.dump backups/uploads-20261122-030000.tar.gz
```

To check a backup without touching production, restore it into a scratch database:

```bash
docker compose exec -T db createdb -U "$POSTGRES_USER" restore_check
docker compose exec -T db pg_restore --no-owner -U "$POSTGRES_USER" -d restore_check < backups/db-….dump
```

---

## Security

- **Server is the source of truth:** prices, discounts, totals, stock, permissions and status changes are all recalculated or checked on the server. Zod validates every input.
- **RBAC:** enforced in every admin page (`requireAdminPage`) and every admin API (`adminRoute`). `proxy.ts` only does optimistic redirects.
- **CSRF:** SameSite=Lax session cookies, and an Origin/Referer check on every state-changing API.
- **Rate limiting:** applies to login, registration, orders, coupon checks, search, newsletter, uploads and admin writes, with Nginx limits in front.
- **Accounts:** sign-in timing is equalised to avoid revealing which emails exist, sessions rotate at login, and changing a password ends other sessions.
- **Orders:** guest order pages need an unguessable token. Only its hash is stored, and it is compared in constant time.
- **Headers:** CSP, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy and HSTS (Nginx).
- **Uploads:** checked by magic bytes, allow-listed (no SVG), size-limited, randomly named and guarded against path traversal.
- **CSV export:** protected against spreadsheet formula injection.
- **Errors and secrets:** API errors are safe (no stack traces), and secrets stay out of client bundles and the Docker image.
- **Audit log:** records sign-ins, failed admin sign-ins, and product, category, order, inventory, promotion, content and settings changes.

---

## Known limitations and next steps

- **Khmer copy** in `src/i18n/messages/km.ts` and the seeded Khmer names should be reviewed by a native speaker before launch.
- **Rate limiting is in memory**, which suits one app instance. Move it to Redis if the app ever runs on more than one instance.
- **Customer reviews:** the database model exists, but there is no storefront or moderation UI yet (the spec lists reviews as optional).
- **No transactional email** (order confirmation, password reset). Password reset currently requires an admin. Adding an email provider is the natural next step.
- **Admin UI language:** the admin interface is English only. Customer-facing content supports English and Khmer.
- **Order message language:** the seller message uses the store's default language (Settings → Default language).
- **Driver warning:** integration tests print a `pg` deprecation warning from the Prisma PostgreSQL adapter. It is harmless and expected to be fixed upstream.
