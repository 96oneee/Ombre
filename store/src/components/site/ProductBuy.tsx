"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MAX_PER_LINE, useCart } from "@/components/cart/CartProvider";
import { formatMoney } from "@/lib/pricing";
import type { CatalogVariant, Currency } from "@/lib/types";

export function Price({ unit, compareAt, currency, className }: { unit: number; compareAt?: number | null; currency: Currency; className?: string }) {
  return (
    <p className={className}>
      <span>{formatMoney(unit, currency)}</span>
      {compareAt != null && <s className="ml-2 text-[0.7em] text-ink-soft">{formatMoney(compareAt, currency)}</s>}
    </p>
  );
}

export function StockNote({ v }: { v: CatalogVariant }) {
  if (v.stock <= 0) return <p className="text-sm font-medium text-red-700">Sold out</p>;
  if (v.stock <= v.low_stock_threshold) return <p className="text-sm font-medium text-amber-700">Only {v.stock} left</p>;
  return <p className="text-sm text-ink-soft">In stock</p>;
}

/** Quantity + "Add to cart" for one colour. */
export function ProductBuy({ variant }: { variant: CatalogVariant }) {
  const { add, lastAdded } = useCart();
  const [qty, setQty] = useState(1);
  const [showAdded, setShowAdded] = useState(false);
  const max = Math.max(1, Math.min(variant.stock, MAX_PER_LINE));
  const soldOut = variant.stock <= 0;

  useEffect(() => {
    if (!showAdded) return;
    const t = setTimeout(() => setShowAdded(false), 6000);
    return () => clearTimeout(t);
  }, [showAdded, lastAdded]);

  return (
    <div>
      <div className="flex items-stretch gap-3">
        <div className="inline-flex min-h-[48px] items-center rounded-full border border-ink/20" role="group" aria-label={`Quantity for ${variant.name}`}>
          <button type="button" className="h-full w-11 rounded-full text-xl hover:bg-linen disabled:opacity-40" aria-label="Decrease quantity" disabled={soldOut || qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>
            −
          </button>
          <output className="min-w-8 text-center" aria-live="polite">
            {soldOut ? 0 : qty}
          </output>
          <button type="button" className="h-full w-11 rounded-full text-xl hover:bg-linen disabled:opacity-40" aria-label="Increase quantity" disabled={soldOut || qty >= max} onClick={() => setQty((q) => Math.min(max, q + 1))}>
            +
          </button>
        </div>
        <button
          type="button"
          className="btn btn-primary flex-1"
          disabled={soldOut}
          onClick={() => {
            add(variant.id, qty, variant.stock);
            setShowAdded(true);
          }}
        >
          {soldOut ? "Sold out" : "Add to cart"}
        </button>
      </div>
      {showAdded && (
        <p className="mt-3 text-sm" role="status">
          Added to your cart.{" "}
          <Link href="/cart" className="font-normal underline">
            View cart
          </Link>{" "}
          or keep browsing.
        </p>
      )}
    </div>
  );
}
