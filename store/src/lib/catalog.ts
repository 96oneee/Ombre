/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { variantPrice } from "./pricing";
import type { CatalogProduct, CatalogVariant, ProductImage } from "./types";

const SELECT = "*, product_variants(*, inventory(quantity, low_stock_threshold)), product_images(*)";

function sortImages(images: ProductImage[]): ProductImage[] {
  return [...images].sort(
    (a, b) => Number(b.is_featured) - Number(a.is_featured) || a.sort_order - b.sort_order,
  );
}

/** Turn a raw database row (product + variants + images + stock) into what the pages need. */
export function normalizeProduct(raw: any): CatalogProduct {
  const images: ProductImage[] = raw.product_images ?? [];
  const shared = sortImages(images.filter((i) => i.variant_id === null));

  const variants: CatalogVariant[] = (raw.product_variants ?? [])
    .filter((v: any) => v.is_active)
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((v: any): CatalogVariant => {
      const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
      const { unit, compareAt } = variantPrice(
        { price: v.price == null ? null : Number(v.price), sale_price: v.sale_price == null ? null : Number(v.sale_price) },
        { price: Number(raw.price), sale_price: raw.sale_price == null ? null : Number(raw.sale_price) },
      );
      const own = sortImages(images.filter((i) => i.variant_id === v.id));
      return {
        id: v.id,
        name: v.name,
        hex_color: v.hex_color,
        sku: v.sku,
        unit_price: unit,
        compare_at: compareAt,
        stock: inv?.quantity ?? 0,
        low_stock_threshold: inv?.low_stock_threshold ?? 5,
        // a colour with no photos of its own falls back to the shared ones
        images: own.length ? own : shared,
      };
    });

  const prices = variants.map((v) => v.unit_price);
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    short_description: raw.short_description,
    description: raw.description,
    specs: Array.isArray(raw.specs) ? raw.specs : [],
    seo_title: raw.seo_title,
    seo_description: raw.seo_description,
    variants,
    shared_images: shared,
    cover_path: variants[0]?.images[0]?.storage_path ?? shared[0]?.storage_path ?? null,
    price_from: prices.length ? Math.min(...prices) : Number(raw.price),
  };
}

function baseQuery(supabase: any) {
  return supabase
    .from("products")
    .select(SELECT)
    .eq("status", "active")
    .eq("product_variants.is_active", true)
    .order("sort_order", { ascending: true })
    .order("sort_order", { referencedTable: "product_variants", ascending: true });
}

export async function getActiveProducts(): Promise<CatalogProduct[]> {
  const supabase = await createClient();
  const { data } = await baseQuery(supabase);
  return (data ?? []).map(normalizeProduct);
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const supabase = await createClient();
  const { data } = await baseQuery(supabase).eq("slug", slug).maybeSingle();
  return data ? normalizeProduct(data) : null;
}

export async function getProductById(id: string): Promise<CatalogProduct | null> {
  const supabase = await createClient();
  const { data } = await baseQuery(supabase).eq("id", id).maybeSingle();
  return data ? normalizeProduct(data) : null;
}
