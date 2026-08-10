"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { formatPrice, venmoLink, CATEGORY_LABEL } from "@/lib/format";
import { getCartToken } from "@/lib/cartToken";
import { useCart } from "@/components/CartProvider";
import type { CartItem, PaymentMethod } from "@/lib/types";
import type { Settings } from "@/lib/settings";

interface GroupedItem {
  product_id: number;
  name: string;
  price_cents: number;
  image_path: string;
  reservationIds: number[];
}

interface OrderConfirmation {
  id: number;
  total_cents: number;
  payment_method: PaymentMethod;
  items: { product_name_snapshot: string; price_cents_snapshot: number }[];
}

function groupItems(items: CartItem[]): GroupedItem[] {
  const map = new Map<number, GroupedItem>();
  for (const item of items) {
    const existing = map.get(item.product_id);
    if (existing) {
      existing.reservationIds.push(item.reservation_id);
    } else {
      map.set(item.product_id, {
        product_id: item.product_id,
        name: item.name,
        price_cents: item.price_cents,
        image_path: item.image_path,
        reservationIds: [item.reservation_id],
      });
    }
  }
  return Array.from(map.values());
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProductId, setBusyProductId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<Settings>({ venmo_username: "", square_link: "" });
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);
  const { refresh, category: cartCategory } = useCart();

  async function loadCart() {
    const token = getCartToken();
    const res = await fetch(`/api/cart?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadCart();
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data.settings))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = groupItems(items);
  const total = items.reduce((sum, i) => sum + i.price_cents, 0);

  async function addOne(productId: number) {
    setBusyProductId(productId);
    setError("");
    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, cart_token: getCartToken() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add another");
        return;
      }
      await loadCart();
      refresh();
    } finally {
      setBusyProductId(null);
    }
  }

  async function removeOne(group: GroupedItem) {
    const reservationId = group.reservationIds[group.reservationIds.length - 1];
    setBusyProductId(group.product_id);
    try {
      await fetch(
        `/api/cart/items/${reservationId}?token=${encodeURIComponent(getCartToken())}`,
        { method: "DELETE" }
      );
      await loadCart();
      refresh();
    } finally {
      setBusyProductId(null);
    }
  }

  async function submitCheckout(method: PaymentMethod) {
    if (!name.trim() || !address.trim()) {
      setError("Please enter your name and address.");
      return;
    }
    setSubmitting(method);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart_token: getCartToken(),
          buyer_name: name,
          buyer_address: address,
          payment_method: method,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Checkout failed");
        return;
      }
      setConfirmation(data.order);
      refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(null);
    }
  }

  const payLink =
    confirmation?.payment_method === "venmo"
      ? venmoLink(
          settings.venmo_username,
          confirmation.total_cents,
          `Jodi's Gems — Order #${confirmation.id}`
        )
      : confirmation?.payment_method === "square"
      ? settings.square_link
      : "";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-black gradient-text">Your Cart</h1>
        {cartCategory && !confirmation && (
          <p className="mt-1 text-sm text-white/50">
            Shopping {CATEGORY_LABEL[cartCategory]} — Paparazzi and BOMB Party are checked out
            separately.
          </p>
        )}

        {confirmation ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-lg border border-[var(--hot-pink)]/40 bg-[var(--hot-pink)]/10 p-4 text-sm">
              <p className="font-bold text-[var(--hot-pink-light)]">
                Order #{confirmation.id} placed! 🎉
              </p>
              <p className="mt-1 text-white/70">
                Complete your {confirmation.payment_method === "venmo" ? "Venmo" : "Square"}{" "}
                payment within 24 hours. We confirm every payment by hand, so please allow a
                little time.
              </p>
            </div>

            <div className="glow-card rounded-xl p-4 text-sm">
              {confirmation.items.map((item, i) => (
                <div key={i} className="flex justify-between py-1 text-white/70">
                  <span>{item.product_name_snapshot}</span>
                  <span>{formatPrice(item.price_cents_snapshot)}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-bold">
                <span>Total</span>
                <span>{formatPrice(confirmation.total_cents)}</span>
              </div>
            </div>

            {payLink ? (
              <a
                href={payLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary block w-full rounded-full py-3 text-center text-sm font-bold"
              >
                Open {confirmation.payment_method === "venmo" ? "Venmo" : "Square"} to pay{" "}
                {formatPrice(confirmation.total_cents)}
              </a>
            ) : (
              <p className="rounded-lg bg-white/5 p-3 text-sm text-white/60">
                {confirmation.payment_method === "venmo" ? "Venmo" : "Square"} isn&apos;t set up
                yet — message us directly to complete payment.
              </p>
            )}

            <Link
              href="/"
              className="block w-full rounded-full border border-white/20 py-2.5 text-center text-sm font-semibold text-white/70 hover:border-white/40"
            >
              Back to shop
            </Link>
          </div>
        ) : loading ? (
          <p className="mt-8 text-white/50">Loading…</p>
        ) : items.length === 0 ? (
          <div className="mt-8 text-center text-white/50">
            <p>Your cart is empty.</p>
            <Link href="/" className="btn-primary mt-4 inline-block rounded-full px-5 py-2 text-sm font-bold">
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-3">
              {grouped.map((g) => (
                <div key={g.product_id} className="glow-card flex items-center gap-4 rounded-xl p-3">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-black/40">
                    {g.image_path ? (
                      <Image src={g.image_path} alt={g.name} fill className="object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-2xl opacity-40">
                        💍
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{g.name}</p>
                    <p className="text-sm text-white/50">{formatPrice(g.price_cents)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={busyProductId === g.product_id}
                      onClick={() => removeOne(g)}
                      className="h-8 w-8 rounded-full border border-white/20 text-white/70 hover:border-white/40 disabled:opacity-30"
                      aria-label={`Remove one ${g.name}`}
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-bold">{g.reservationIds.length}</span>
                    <button
                      disabled={busyProductId === g.product_id}
                      onClick={() => addOne(g.product_id)}
                      className="h-8 w-8 rounded-full border border-white/20 text-white/70 hover:border-white/40 disabled:opacity-30"
                      aria-label={`Add one more ${g.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-between text-lg font-black">
              <span>Total</span>
              <span className="text-[var(--hot-pink-light)]">{formatPrice(total)}</span>
            </div>

            <div className="glow-card mt-8 space-y-4 rounded-2xl p-5">
              <h2 className="font-bold text-white/80">Checkout</h2>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[var(--hot-pink)]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  Address
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Shipping or pickup address"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[var(--hot-pink)]"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex flex-col gap-3">
                <button
                  disabled={submitting !== null}
                  onClick={() => submitCheckout("venmo")}
                  className="btn-venmo w-full rounded-full py-3 text-sm font-bold disabled:opacity-50"
                >
                  {submitting === "venmo" ? "Placing order…" : "Checkout with Venmo"}
                </button>
                <button
                  disabled={submitting !== null}
                  onClick={() => submitCheckout("square")}
                  className="btn-square w-full rounded-full py-3 text-sm font-bold disabled:opacity-50"
                >
                  {submitting === "square" ? "Placing order…" : "Checkout with Square"}
                </button>
              </div>
              <p className="text-center text-xs text-white/40">
                We&apos;ll hold your pieces for 24 hours while you pay. If payment isn&apos;t
                confirmed by then, they go back up for sale.
              </p>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
