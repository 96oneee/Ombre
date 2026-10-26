"use client";
import Link from "next/link";
import { useState } from "react";
import { BUCKETS, publicUrl } from "@/lib/storage";
import type { CatalogProduct, Currency } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImagePlaceholder } from "./Carousel";
import { Price, ProductBuy, StockNote } from "./ProductBuy";

export function ShopCard({ product, currency }: { product: CatalogProduct; currency: Currency }) {
  const [selected, setSelected] = useState(product.variants[0]?.id ?? "");
  const variant = product.variants.find((v) => v.id === selected) ?? product.variants[0];
  const cover = publicUrl(BUCKETS.products, variant?.images[0]?.storage_path ?? product.cover_path);

  return (
    <article className="flex flex-col">
      <Link href={`/product/${product.slug}`} className="block overflow-hidden bg-dune" aria-label={`View ${product.name}`}>
        {cover ? <img src={cover} alt={`${product.name}${variant ? ` in ${variant.name}` : ""}`} className="aspect-[4/5] w-full object-cover transition-transform duration-500 hover:scale-[1.03]" loading="lazy" /> : <ImagePlaceholder label="Product photo placeholder" className="aspect-[4/5] w-full" />}
      </Link>
      <div className="mt-4 flex items-start justify-between gap-4">
        <h2 className="font-display text-[34px] font-light leading-none">
          <Link href={`/product/${product.slug}`} className="hover:underline">
            {product.name}
          </Link>
        </h2>
        {variant && <Price unit={variant.unit_price} compareAt={variant.compare_at} currency={currency} className="pt-1 font-display text-[24px] leading-none" />}
      </div>
      {product.short_description && <p className="mt-2 text-mist">{product.short_description}</p>}

      {product.variants.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Choose a color">
          {product.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={v.id === selected}
              onClick={() => setSelected(v.id)}
              className={cn("inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3 text-sm", v.id === selected ? "border-charcoal" : "border-charcoal/20 hover:border-charcoal/60")}
            >
              <span className="h-4 w-4 rounded-full border border-ink/20" style={{ background: v.hex_color ?? "#ddd" }} />
              {v.name}
            </button>
          ))}
        </div>
      )}

      {variant ? (
        <div className="mt-4">
          <div className="mb-3">
            <StockNote v={variant} />
          </div>
          <ProductBuy key={variant.id} variant={variant} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-mist">No colors available.</p>
      )}
    </article>
  );
}
