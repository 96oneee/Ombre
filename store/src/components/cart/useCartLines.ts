/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { variantPrice } from "@/lib/pricing";
import type { CartItem } from "./CartProvider";

export interface CartLine {
  variantId: string;
  productName: string;
  slug: string;
  variantName: string;
  hex: string | null;
  unit: number;
  compareAt: number | null;
  stock: number;
  imagePath: string | null;
  quantity: number;
}

interface Detail extends Omit<CartLine, "quantity"> {}

/**
 * Loads current names, prices, stock and photos for what is in the cart.
 * Prices shown here are for display; the server recalculates everything at checkout.
 */
export function useCartLines(items: CartItem[], ready: boolean) {
  const [details, setDetails] = useState<Detail[]>([]);
  const [loading, setLoading] = useState(true);
  const key = items.map((i) => i.variantId).sort().join(",");

  useEffect(() => {
    if (!ready) return;
    const ids = key ? key.split(",") : [];
    if (!ids.length) {
      setDetails([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: variants } = await supabase
        .from("product_variants")
        .select("id, name, hex_color, price, sale_price, product_id, products(id, name, slug, price, sale_price, status), inventory(quantity)")
        .in("id", ids);
      const productIds = Array.from(new Set((variants ?? []).map((v: any) => v.product_id)));
      const { data: images } = productIds.length
        ? await supabase.from("product_images").select("*").in("product_id", productIds)
        : { data: [] as any[] };
      if (cancelled) return;

      const rows: Detail[] = (variants ?? []).map((v: any) => {
        const p = Array.isArray(v.products) ? v.products[0] : v.products;
        const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
        const mine = (images ?? [])
          .filter((i: any) => i.product_id === v.product_id && (i.variant_id === v.id || i.variant_id === null))
          .sort(
            (a: any, b: any) =>
              Number(b.variant_id === v.id) - Number(a.variant_id === v.id) ||
              Number(b.is_featured) - Number(a.is_featured) ||
              a.sort_order - b.sort_order,
          );
        const { unit, compareAt } = variantPrice(
          { price: v.price == null ? null : Number(v.price), sale_price: v.sale_price == null ? null : Number(v.sale_price) },
          { price: Number(p?.price ?? 0), sale_price: p?.sale_price == null ? null : Number(p.sale_price) },
        );
        return {
          variantId: v.id,
          productName: p?.name ?? "",
          slug: p?.slug ?? "",
          variantName: v.name,
          hex: v.hex_color,
          unit,
          compareAt,
          stock: inv?.quantity ?? 0,
          imagePath: mine[0]?.storage_path ?? null,
        };
      });
      setDetails(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [key, ready]);

  return useMemo(() => {
    const byId = new Map<string, Detail>(details.map((d) => [d.variantId, d] as [string, Detail]));
    const lines: CartLine[] = [];
    const unavailable: string[] = [];
    for (const item of items) {
      const d = byId.get(item.variantId);
      if (d) lines.push({ ...d, quantity: item.quantity });
      else if (!loading) unavailable.push(item.variantId);
    }
    const subtotal = lines.reduce((sum, l) => sum + l.unit * l.quantity, 0);
    const problems = lines.filter((l) => l.stock < l.quantity);
    return { lines, unavailable, subtotal, problems, loading: loading || !ready };
  }, [details, items, loading, ready]);
}
