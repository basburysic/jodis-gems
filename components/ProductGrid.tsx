"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import { useCart } from "@/components/CartProvider";
import { CATEGORY_LABEL } from "@/lib/format";
import type { Category, Product } from "@/lib/types";

export default function ProductGrid({
  initialProducts,
  category,
}: {
  initialProducts: Product[];
  category: Category;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [selected, setSelected] = useState<Product | null>(null);
  const [clearing, setClearing] = useState(false);
  const router = useRouter();
  const { category: cartCategory, clearCart } = useCart();

  function handleAdded(productId: number) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, quantity_available: p.quantity_available - 1 } : p
      )
    );
    router.refresh();
  }

  async function handleClearCart() {
    setClearing(true);
    try {
      await clearCart();
    } finally {
      setClearing(false);
    }
  }

  const blocked = cartCategory !== null && cartCategory !== category;

  return (
    <>
      {blocked && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-4 text-sm">
          <p className="text-[var(--gold)]">
            Your cart has {CATEGORY_LABEL[cartCategory]} pieces in it — Paparazzi and BOMB Party
            have to be checked out separately, so those need to be cleared before you can shop{" "}
            {CATEGORY_LABEL[category]}.
          </p>
          <button
            disabled={clearing}
            onClick={handleClearCart}
            className="rounded-full border border-[var(--gold)]/50 px-4 py-1.5 text-xs font-bold text-[var(--gold)] hover:bg-[var(--gold)]/10 disabled:opacity-50"
          >
            {clearing ? "Clearing…" : "Clear Cart"}
          </button>
        </div>
      )}

      {products.length === 0 ? (
        <p className="mt-16 text-center text-white/50">
          Nothing listed here yet — check back soon!
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onClick={() => setSelected(product)} />
          ))}
        </div>
      )}

      {selected && (
        <ProductModal
          product={selected}
          onClose={() => setSelected(null)}
          onAdded={handleAdded}
        />
      )}
    </>
  );
}
