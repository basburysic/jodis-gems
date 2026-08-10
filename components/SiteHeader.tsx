"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export default function SiteHeader() {
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-black tracking-wide gradient-text">
          ✦ JODI&apos;S GEMS ✦
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/shop/paparazzi" className="hover:text-[var(--hot-pink-light)]">
            Paparazzi
          </Link>
          <Link href="/shop/bomb_party" className="hover:text-[var(--hot-pink-light)]">
            BOMB Party
          </Link>
          <Link
            href="/cart"
            className="btn-primary flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm"
          >
            🛍️ Cart
            {count > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 text-xs font-bold">{count}</span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
