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

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the shop, or
[http://localhost:3000/admin](http://localhost:3000/admin) for the dashboard.

**Default admin password is `changeme123`** — change it (see below) before you start
using this for real.

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

Everything lives locally in a SQLite file at `data/jodis-gems.db`, and uploaded
product photos go in `public/uploads/`. Both are git-ignored. Back up the `data/`
folder occasionally if this matters to you — there's no cloud copy until you deploy
somewhere with persistent storage.

## Deploying so it's live on the internet

This currently runs only on your own machine. When you're ready to put it online:

- **Database:** SQLite works for local dev, but most hosts (Vercel, Netlify, etc.)
  don't offer persistent local disk, so `data/jodis-gems.db` would reset on every
  deploy. Before deploying, swap in a hosted database (e.g.
  [Turso](https://turso.tech) for SQLite-compatible hosting, or Postgres via
  [Neon](https://neon.tech)/[Supabase](https://supabase.com)) — ask me and I can wire
  that up.
- **Photo uploads:** same issue — `public/uploads` won't persist on most hosts.
  Swap the upload route to a storage service (e.g. Vercel Blob, Cloudflare R2, or
  Supabase Storage).
- **Environment variables:** set `ADMIN_PASSWORD` and `SESSION_SECRET` in your host's
  dashboard instead of `.env.local`.

Ask me when you're ready and I'll walk through it with your chosen host.
