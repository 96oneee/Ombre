"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const KEY = "store-cart-v1";
export const MAX_PER_LINE = 20;

export interface CartItem {
  variantId: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  ready: boolean;
  lastAdded: number; // timestamp, used to flash "added" feedback
  add: (variantId: string, quantity: number, maxStock?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function read(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((i) => i && typeof i.variantId === "string" && Number.isInteger(i.quantity) && i.quantity > 0)
      .map((i) => ({ variantId: i.variantId, quantity: Math.min(i.quantity, MAX_PER_LINE) }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [lastAdded, setLastAdded] = useState(0);

  useEffect(() => {
    setItems(read());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setItems(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: cart still works for this visit */
    }
  }, []);

  const add = useCallback(
    (variantId: string, quantity: number, maxStock?: number) => {
      const cap = Math.min(MAX_PER_LINE, maxStock ?? MAX_PER_LINE);
      const current = read();
      const existing = current.find((i) => i.variantId === variantId);
      const next = existing
        ? current.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(cap, i.quantity + quantity) } : i))
        : [...current, { variantId, quantity: Math.min(cap, quantity) }];
      commit(next);
      setLastAdded(Date.now());
    },
    [commit],
  );

  const setQuantity = useCallback(
    (variantId: string, quantity: number) => {
      const q = Math.min(MAX_PER_LINE, Math.floor(quantity));
      commit(q <= 0 ? read().filter((i) => i.variantId !== variantId) : read().map((i) => (i.variantId === variantId ? { ...i, quantity: q } : i)));
    },
    [commit],
  );

  const remove = useCallback((variantId: string) => commit(read().filter((i) => i.variantId !== variantId)), [commit]);
  const clear = useCallback(() => commit([]), [commit]);

  const value = useMemo<CartContextValue>(
    () => ({ items, count: items.reduce((n, i) => n + i.quantity, 0), ready, lastAdded, add, setQuantity, remove, clear }),
    [items, ready, lastAdded, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
