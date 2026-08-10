"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCartToken } from "@/lib/cartToken";
import type { Category } from "@/lib/types";

interface CartContextValue {
  count: number;
  category: Category | null;
  refresh: () => void;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue>({
  count: 0,
  category: null,
  refresh: () => {},
  clearCart: async () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const [category, setCategory] = useState<Category | null>(null);

  const refresh = useCallback(() => {
    const token = getCartToken();
    if (!token) return;
    fetch(`/api/cart?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        setCount(Array.isArray(data.items) ? data.items.length : 0);
        setCategory(data.category ?? null);
      })
      .catch(() => {});
  }, []);

  const clearCart = useCallback(async () => {
    const token = getCartToken();
    if (!token) return;
    await fetch("/api/cart/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart_token: token }),
    });
    refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <CartContext.Provider value={{ count, category, refresh, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
