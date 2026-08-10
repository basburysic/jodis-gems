"use client";

import Image from "next/image";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function ProductCard({
  product,
  onClick,
}: {
  product: Product;
  onClick: () => void;
}) {
  const soldOut = product.quantity_available <= 0;
  const low = !soldOut && product.quantity_available <= 2;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={soldOut}
      className="glow-card flex flex-col overflow-hidden rounded-xl text-left disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-[#2a0f24] to-[#160a17]">
        {product.image_path ? (
          <Image
            src={product.image_path}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <span className="text-5xl opacity-40">💍</span>
        )}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="badge-sold-out rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide">
              Sold out
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold">{product.name}</h3>
        <p className="text-lg font-black text-[var(--hot-pink-light)]">
          {formatPrice(product.price_cents)}
        </p>
        {!soldOut && (
          <span
            className={`mt-1 w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              low ? "badge-low" : "badge-available"
            }`}
          >
            {product.quantity_available} left
          </span>
        )}
      </div>
    </button>
  );
}
