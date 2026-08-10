"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { getCartToken } from "@/lib/cartToken";
import { useCart } from "@/components/CartProvider";
import type { Product } from "@/lib/types";

export default function ProductModal({
  product,
  onClose,
  onAdded,
}: {
  product: Product;
  onClose: () => void;
  onAdded: (productId: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const [categoryMismatch, setCategoryMismatch] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { refresh, clearCart: clearCartGlobal } = useCart();

  async function addToCart() {
    setAdding(true);
    setError("");
    setCategoryMismatch(false);
    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id, cart_token: getCartToken() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add to cart");
        setCategoryMismatch(data.reason === "category_mismatch");
        return;
      }
      setAdded(true);
      onAdded(product.id);
      refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function clearCartAndAdd() {
    setClearing(true);
    try {
      await clearCartGlobal();
      await addToCart();
    } finally {
      setClearing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="glow-card w-full max-w-md rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-black gradient-text">{product.name}</h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-white/50 hover:text-white"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="relative mt-4 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#2a0f24] to-[#160a17]">
          {product.image_path ? (
            <Image src={product.image_path} alt={product.name} fill className="object-cover" />
          ) : (
            <span className="text-6xl opacity-40">💍</span>
          )}
        </div>

        <p className="mt-4 text-2xl font-black text-[var(--hot-pink-light)]">
          {formatPrice(product.price_cents)}
        </p>
        {product.description && <p className="mt-1 text-sm text-white/60">{product.description}</p>}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {!added ? (
          categoryMismatch ? (
            <div className="mt-5 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-full border border-white/20 py-2.5 text-sm font-semibold text-white/70 hover:border-white/40"
              >
                Never Mind
              </button>
              <button
                disabled={clearing}
                onClick={clearCartAndAdd}
                className="btn-primary flex-1 rounded-full py-2.5 text-sm font-bold disabled:opacity-50"
              >
                {clearing ? "Clearing…" : "Clear Cart & Add This"}
              </button>
            </div>
          ) : (
            <button
              disabled={adding}
              onClick={addToCart}
              className="btn-primary mt-5 w-full rounded-full py-3 text-sm font-bold disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add to Cart"}
            </button>
          )
        ) : (
          <div className="mt-5 space-y-3">
            <div className="rounded-lg border border-[var(--hot-pink)]/40 bg-[var(--hot-pink)]/10 p-3 text-center text-sm font-semibold text-[var(--hot-pink-light)]">
              Added to cart ✓ — held for you for 24 hours
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-full border border-white/20 py-2.5 text-sm font-semibold text-white/70 hover:border-white/40"
              >
                Keep Shopping
              </button>
              <Link
                href="/cart"
                className="btn-primary flex-1 rounded-full py-2.5 text-center text-sm font-bold"
              >
                Go to Cart
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
