"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import type { HomeContent } from "@/lib/home";
import { formatMoney } from "@/lib/pricing";
import { BUCKETS, publicUrl } from "@/lib/storage";
import type { CatalogProduct, Currency } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Em } from "./Em";

/** Chapter 3 · Choose your shade. Every value comes from the product and its colour variants. */
export function ChooseShade({ c, product, currency }: { c: HomeContent["shade"]; product: CatalogProduct | null; currency: Currency }) {
  const variants = product?.variants ?? [];
  const [i, setI] = useState(() => Math.max(0, variants.findIndex((v) => v.stock > 0)));
  const [added, setAdded] = useState(false);
  const { add } = useCart();
  if (!product || !variants.length) return null;

  const v = variants[i];
  const soldOut = v.stock <= 0;
  const low = !soldOut && v.stock <= v.low_stock_threshold;

  const onAdd = () => {
    add(v.id, 1, v.stock);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };

  return (
    <section
      id="shade"
      className="relative scroll-mt-16 overflow-hidden py-24 transition-colors duration-1000 md:py-40"
      style={{ backgroundColor: `color-mix(in srgb, ${v.hex_color ?? "#E3DBCB"} 14%, #F2EDE3)` }}
      aria-labelledby="shade-title"
    >
      <div className="container-x grid items-center gap-12 md:grid-cols-12 md:gap-10">
        <div className="relative aspect-[4/5] overflow-hidden bg-dune md:col-span-7">
          {variants.map((x, k) => {
            const src = publicUrl(BUCKETS.products, x.images[0]?.storage_path);
            return src ? (
              <Image
                key={x.id}
                src={src}
                alt={k === i ? x.images[0]?.alt_text || `${product.name} in ${x.name}` : ""}
                aria-hidden={k !== i}
                fill
                sizes="(min-width: 768px) 58vw, 100vw"
                className={cn("object-cover transition-[opacity,transform] duration-[1100ms] ease-shade", k === i ? "scale-100 opacity-100" : "scale-[1.04] opacity-0")}
              />
            ) : null;
          })}
        </div>

        <div className="md:col-span-5 md:pl-6">
          <p className="eyebrow">{c.eyebrow}</p>
          <h2 id="shade-title" className="mt-4 font-display text-[44px] font-light leading-none md:text-[80px]">
            <Em text={c.title} />
          </h2>
          <p className="mt-5 max-w-[34ch] text-[16px] leading-relaxed text-mist">{c.text}</p>

          <fieldset className="mt-10">
            <legend className="eyebrow mb-4">
              Colour: <span className="text-charcoal">{v.name}</span>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {variants.map((x, k) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={k === i}
                  onClick={() => setI(k)}
                  className={cn(
                    "group flex min-h-[64px] items-center gap-4 border px-4 text-left transition-colors",
                    k === i ? "border-charcoal bg-shell" : "border-charcoal/15 hover:border-charcoal/50",
                  )}
                >
                  <span className="h-8 w-8 shrink-0 rounded-full ring-1 ring-charcoal/15 ring-offset-2 ring-offset-transparent" style={{ backgroundColor: x.hex_color ?? "#ccc" }} aria-hidden />
                  <span>
                    <span className="block font-display text-[22px] leading-none">{x.name}</span>
                    <span className="mt-1 block text-[12px] text-mist">{x.stock > 0 ? formatMoney(x.unit_price, currency) : "Sold out"}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-10 flex items-baseline gap-4">
            <p className="font-display text-[44px] leading-none">{formatMoney(v.unit_price, currency)}</p>
            {v.compare_at && <p className="text-mist line-through">{formatMoney(v.compare_at, currency)}</p>}
          </div>
          <p className="mt-3 flex items-center gap-2 text-[13px] text-mist" aria-live="polite">
            <span className={cn("h-2 w-2 rounded-full", soldOut ? "bg-red-700" : low ? "bg-wood" : "bg-emerald-700")} aria-hidden />
            {soldOut ? "Sold out" : low ? `Only ${v.stock} left` : "In stock"} · {product.short_description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onAdd} disabled={soldOut} className="btn btn-primary flex-1">
              {added ? "Added to cart" : soldOut ? "Sold out" : "Add to cart"}
            </button>
            <Link href={`/product/${product.slug}`} className="btn btn-outline">
              Details
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
