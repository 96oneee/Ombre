"use client";
import { useState } from "react";
import { BUCKETS, publicUrl } from "@/lib/storage";
import type { CatalogProduct, Currency } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Carousel } from "./Carousel";
import { Price, ProductBuy, StockNote } from "./ProductBuy";

/** Product page body: one gallery that follows the chosen colour, and the buy panel beside it. */
export function ProductView({
  product,
  currency,
  initialVariant,
  children,
}: {
  product: CatalogProduct;
  currency: Currency;
  initialVariant?: string;
  /** Delivery, payment and specs, rendered on the server below the buy button. */
  children?: React.ReactNode;
}) {
  const first = product.variants.find((v) => v.name.toLowerCase() === initialVariant?.toLowerCase()) ?? product.variants[0];
  const [selected, setSelected] = useState(first?.id ?? "");
  const v = product.variants.find((x) => x.id === selected) ?? first;

  const slides = [...(v?.images ?? []), ...product.shared_images]
    .map((img) => ({ url: publicUrl(BUCKETS.products, img.storage_path) ?? "", alt: img.alt_text || `${product.name}${v ? ` in ${v.name}` : ""}` }))
    .filter((s) => s.url);

  return (
    <div className="container-x grid items-start gap-10 pb-16 pt-8 md:grid-cols-[1.15fr_0.85fr] md:gap-16 md:pb-24 md:pt-12">
      <Carousel key={v?.id} label={`${product.name}${v ? ` in ${v.name}` : ""}`} placeholderLabel="No photos yet" slides={slides} />

      <div className="md:sticky md:top-28">
        <h1 className="font-display text-[56px] font-light leading-none tracking-tight md:text-[88px]">{product.name}</h1>
        {product.short_description && <p className="mt-4 max-w-[40ch] text-[16px] leading-relaxed text-mist">{product.short_description}</p>}

        {v ? (
          <>
            <Price unit={v.unit_price} compareAt={v.compare_at} currency={currency} className="mt-8 font-display text-[40px] leading-none" />

            {product.variants.length > 1 && (
              <div className="mt-8">
                <p className="eyebrow">
                  Colour <span className="ml-2 normal-case tracking-normal text-charcoal">{v.name}</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-3" role="group" aria-label="Choose a colour">
                  {product.variants.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      aria-pressed={x.id === v.id}
                      aria-label={x.name}
                      title={x.name}
                      onClick={() => setSelected(x.id)}
                      className={cn("grid h-12 w-12 place-items-center rounded-full border transition-colors", x.id === v.id ? "border-charcoal" : "border-transparent hover:border-charcoal/30")}
                    >
                      <span className="h-9 w-9 rounded-full ring-1 ring-charcoal/15" style={{ background: x.hex_color ?? "#ddd" }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <StockNote v={v} />
            </div>
            <div className="mt-4">
              <ProductBuy key={v.id} variant={v} />
            </div>
          </>
        ) : (
          <p className="mt-8 text-mist">No colours are available right now.</p>
        )}

        {children}
      </div>
    </div>
  );
}
