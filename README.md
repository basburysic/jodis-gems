# Jodi's Gems

A storefront for two jewelry lines — **Paparazzi** (flat $8 each) and **BOMB Party**
(priced individually) — with live inventory counts, a Venmo/Square checkout flow, and
an admin panel for managing stock and confirming payments.

## How it works

- **Shoppers** browse Paparazzi or BOMB Party, click a piece, and hit **Add to
  Cart**. That instantly holds the piece for **24 hours** (stock count drops right
  away) so nobody else can grab it out from under them. They can keep shopping
  across both collections, adjust quantities in the cart, then **check out once**
  at the end: name, address, and a single Venmo or Square payment for the whole
  order. If they never pay, the hold on each piece automatically expires and it
  goes back on sale — no cron job needed, it's checked every time the site loads.
- **You (admin)** get a dashboard at `/admin` (with a Home button back to the
  storefront) to:
  - See orders awaiting payment — grouped by shopper, with their name, address,
    itemized cart, and total — and click **Confirm paid** (finalizes the sale) or
    **Release** (cancels the hold early, restores stock).
  - Add/edit products, adjust quantities, or hit **Sold on live −1** to instantly
    remove a piece when you sell it on a livestream — no cart step needed.
  - Set your default Venmo username and Square payment link. Any product can
    override these with its own link if needed.

## Running it locally

This app runs on **Cloudflare Workers** (database: D1), so local dev emulates that the
same way Cloudflare runs it in production — no separate "local mode" code path to keep
in sync.

```bash
npm install
npx wrangler d1 migrations apply DB --local   # first time only, creates the tables
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the shop, or
[http://localhost:3000/admin](http://localhost:3000/admin) for the dashboard.

**Default admin password is `changeme123`** — change it (see below) before you start
using this for real.

> Local D1 data lives under `.wrangler/` (git-ignored) and is independent of whatever's
> live on Cloudflare — adding test products locally never touches production.

## First-time setup

1. **Change the admin password.** Open [`.env.local`](.env.local) and edit
   `ADMIN_PASSWORD`. (This file is already git-ignored, so your password won't get
   committed.)
2. **Set up Venmo.** In `/admin` → *Payment settings*, enter your Venmo username
   (with or without the `@`). No Venmo API/account setup is required — it just
   builds a link that opens the Venmo app with the amount and item name pre-filled.
   You still confirm payment by hand once you see it land in Venmo.
3. **Set up Square.** Square has no simple no-account option like Venmo, so:
   - Log into your [Square Dashboard](https://squareup.com/dashboard) → **Payment
     Links** (free, no API keys needed) → create a link (you can make one general
     "Pay Jodi's Gems" link, or a specific one per pricier item).
   - Paste that link into *Payment settings* → **Square payment link**.
   - Because Square links are usually fixed-amount, either make a flexible
     "any amount" link, or for BOMB Party pieces create one link per item and paste
     it into that product's own Square link field (in the inventory editor — every
     product can override the site-wide default).
4. **Add your inventory.** In `/admin` → *Inventory* → *Add a piece*: choose the
   category, name, price, starting quantity, and optionally a description. There's no
   photo upload right now (see below) — pieces show a placeholder icon instead.

## Data

Products, orders, and settings live in a **Cloudflare D1** database (binding `DB`).
Locally this is emulated by Wrangler under `.wrangler/` (git-ignored); in production
it's the real thing on Cloudflare.

### No product photos (yet)

Photo uploads would need Cloudflare R2 (file storage), which requires opting into a
Cloudflare product separately from Workers/D1 — skipped for now by choice rather than
built and left broken. Products show a placeholder gem icon instead. Options whenever
you want photos back: enable R2 (genuinely free at this scale) and I'll wire the
upload back up, or add a simpler "paste an image URL" field that needs no Cloudflare
storage at all (photo would need to be hosted somewhere else, like an existing social
post or a free image host).

## Deploying to Cloudflare (one-time setup)

This repo is connected to Cloudflare the same way **lazy-dm** is — Cloudflare builds
and deploys automatically on every push to `main`, no local CLI login needed. One-time
setup in the Cloudflare dashboard:

1. **Connect the repo.** Workers & Pages → Create → Connect to Git → pick
   `basburysic/jodis-gems`. When it asks for build settings:
   - Build command: `npm run cf:build`
   - Deploy command: `npx wrangler deploy` (if it's asked for separately —
     some flows run this automatically after the build command)
2. **Create the database.** Workers & Pages → D1 → Create database → name it
   `jodis-gems-db`. Open it → **Console** tab → paste in the contents of
   [`migrations/0001_init.sql`](migrations/0001_init.sql) and run it once to create
   the tables.
   - The database's **binding is already defined in `wrangler.jsonc`** (with its ID
     baked in), so it's attached automatically on every deploy — no dashboard step
     needed for this one. If you ever recreate the database from scratch, update the
     `database_id` in `wrangler.jsonc` to match.
   - ⚠️ Don't add/change bindings only through the dashboard's Bindings tab for this
     project — this repo auto-deploys from every Git push, and each build reads
     bindings fresh from `wrangler.jsonc`. A dashboard-only binding gets silently
     dropped by the next push. If you need a new binding, add it to `wrangler.jsonc`
     and push, not just the dashboard.
3. **Set secrets.** Worker → **Settings** → Variables and Secrets → add:
   - `ADMIN_PASSWORD` — your real admin password (not `changeme123`)
   - `SESSION_SECRET` — any long random string (the one in `.env.local` works, or
     generate a fresh one)
5. **Turn the URL on.** Worker → **Domains** (or Domains and routes) → enable the
   `workers.dev` route. Your live link is `jodis-gems.<your-subdomain>.workers.dev`.
6. **Deploy.** Push a commit (or hit Retry build) so it picks up the bindings/secrets.
