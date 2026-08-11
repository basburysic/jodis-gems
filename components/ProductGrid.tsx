"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import type { Product } from "@/lib/types";

export default function ProductGrid({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [selected, setSelected] = useState<Product | null>(null);
  const router = useRouter();

  function handleAdded(productId: number) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, quantity_available: p.quantity_available - 1 } : p
      )
    );
    router.refresh();
  }

  return (
    <>
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
