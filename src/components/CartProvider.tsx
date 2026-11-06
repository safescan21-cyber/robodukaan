"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/types";

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  coupon: string | null;
  setCoupon: (code: string | null) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "robodukaan-cart-v1";
const COUPON_KEY = "robodukaan-coupon";

function load(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [coupon, setCouponState] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from browser storage once
    setItems(load());
    try {
      setCouponState(window.localStorage.getItem(COUPON_KEY));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable: cart still works for this visit */
    }
  }, [items, ready]);

  const add = useCallback<CartContextValue["add"]>((item, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((i) => i.productId === item.productId);
      if (existing) {
        return current.map((i) =>
          i.productId === item.productId
            ? { ...i, ...item, quantity: Math.min(i.quantity + quantity, item.stock) }
            : i,
        );
      }
      return [...current, { ...item, quantity: Math.min(quantity, item.stock) }];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) =>
      current
        .map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.max(0, Math.min(quantity, i.stock)) }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((current) => current.filter((i) => i.productId !== productId));
  }, []);

  const setCoupon = useCallback((code: string | null) => {
    setCouponState(code);
    try {
      if (code) window.localStorage.setItem(COUPON_KEY, code);
      else window.localStorage.removeItem(COUPON_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setCoupon(null);
  }, [setCoupon]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.quantity * i.price, 0),
      add,
      setQuantity,
      remove,
      clear,
      coupon,
      setCoupon,
    }),
    [items, ready, add, setQuantity, remove, clear, coupon, setCoupon],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
