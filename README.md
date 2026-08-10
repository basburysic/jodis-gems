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

This app runs on **Cloudflare Workers** (database: D1, photo storage: R2), so local
dev emulates those the same way Cloudflare runs them in production — no separate
"local mode" code path to keep in sync.

```bash
npm install
npx wrangler d1 migrations apply DB --local   # first time only, creates the tables
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the shop, or
[http://localhost:3000/admin](http://localhost:3000/admin) for the dashboard.

**Default admin password is `changeme123`** — change it (see below) before you start
using this for real.

> Local D1/R2 data lives under `.wrangler/` (git-ignored) and is independent of
> whatever's live on Cloudflare — adding test products locally never touches
> production.

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
   category, name, price, starting quantity, and optionally a photo and description.

## Data & photos

Products, orders, and settings live in a **Cloudflare D1** database (binding `DB`).
Uploaded product photos live in a **Cloudflare R2** bucket (binding `UPLOADS`) and are
served back through `/uploads/[filename]`. Locally these are emulated by Wrangler
under `.wrangler/` (git-ignored); in production they're the real thing on Cloudflare.

## Deploying to Cloudflare (one-time setup)

This repo is connected to Cloudflare the same way **lazy-dm** is — Cloudflare builds
and deploys automatically on every push to `main`, no local CLI login needed. One-time
setup in the Cloudflare dashboard:

1. **Connect the repo.** Workers & Pages → Create → Connect to Git → pick
   `basbury2208/jodis-gems`. When it asks for build settings:
   - Build command: `npm run cf:build`
   - Deploy command: `npx wrangler deploy` (if it's asked for separately —
     some flows run this automatically after the build command)
2. **Create the database.** Workers & Pages → D1 → Create database → name it
   `jodis-gems-db`. Open it → **Console** tab → paste in the contents of
   [`migrations/0001_init.sql`](migrations/0001_init.sql) and run it once to create
   the tables.
3. **Create the bucket.** R2 → Create bucket → name it `jodis-gems-uploads`.
4. **Attach both to the Worker.** Your `jodis-gems` Worker → Settings → Bindings →
   Add binding:
   - D1 database → binding name **`DB`** → select `jodis-gems-db`
   - R2 bucket → binding name **`UPLOADS`** → select `jodis-gems-uploads`

   (Binding names must match exactly — that's what the code looks for.)
5. **Set secrets.** Same Settings → Variables and Secrets → add:
   - `ADMIN_PASSWORD` — your real admin password (not `changeme123`)
   - `SESSION_SECRET` — any long random string (the one in `.env.local` works, or
     generate a fresh one)
6. **Deploy.** Save and redeploy (or just push a commit) so the bindings/secrets take
   effect. You'll get a `*.workers.dev` URL to start with; a real domain can be
   attached later under Settings → Domains & Routes.

> ⚠️ I wasn't able to runtime-test the D1/R2 code locally in my own dev environment —
> local `wrangler`/Miniflare couldn't spawn its emulation process there (an
> environment quirk on my end, not your machine). It's type-checked and the query
> logic was written carefully against Cloudflare's documented D1 API, but the very
> first real test of this flow will be either you running it locally or Cloudflare's
> own build/deploy. Try `npm run dev` locally first and flag anything that looks off.
