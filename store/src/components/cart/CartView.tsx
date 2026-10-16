"use client";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { useCartLines } from "@/components/cart/useCartLines";
import { ImagePlaceholder } from "@/components/site/Carousel";
import { deliveryFee, formatMoney } from "@/lib/pricing";
import { BUCKETS, publicUrl } from "@/lib/storage";
import type { Currency, DeliveryRegion, DeliverySettings } from "@/lib/types";

export function CartView({ currency, delivery, regions }: { currency: Currency; delivery: DeliverySettings; regions: DeliveryRegion[] }) {
  const { items, ready, setQuantity, remove } = useCart();
  const { lines, unavailable, subtotal, problems, loading } = useCartLines(items, ready);
  const money = (n: number) => formatMoney(n, currency);

  if (loading) return <p className="py-20 text-ink-soft" role="status">Loading your cart…</p>;

  if (lines.length === 0 && unavailable.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-4xl">Your cart is empty</p>
        <p className="mt-3 text-ink-soft">Pick a color and it will show up here.</p>
        <Link href="/shop" className="btn btn-primary mt-8">
          Go to shop
        </Link>
      </div>
    );
  }

  const fee = deliveryFee(delivery, null, subtotal);
  const feeVaries = regions.some((r) => r.fee_override != null && r.fee_override !== delivery.flat_fee);
  const blocked = problems.length > 0 || unavailable.length > 0 || !delivery.is_enabled || lines.length === 0;

  return (
    <div className="grid gap-12 lg:grid-cols-[1.4fr_0.6fr]">
      <div>
        {unavailable.length > 0 && (
          <div role="alert" className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Some items are no longer available.{" "}
            <button type="button" className="underline" onClick={() => unavailable.forEach(remove)}>
              Remove them
            </button>
          </div>
        )}
        <ul className="divide-y divide-ink/15 border-y border-ink/15">
          {lines.map((l) => {
            const img = publicUrl(BUCKETS.products, l.imagePath);
            const over = l.quantity > l.stock;
            return (
              <li key={l.variantId} className="grid grid-cols-[88px_1fr] gap-4 py-6 sm:grid-cols-[112px_1fr]">
                <Link href={`/product/${l.slug}`} className="block overflow-hidden rounded bg-linen">
                  {img ? <img src={img} alt="" className="aspect-[4/5] w-full object-cover" /> : <ImagePlaceholder label="Photo" className="aspect-[4/5] w-full text-xs" />}
                </Link>
                <div className="flex flex-col">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-display text-2xl">{l.productName}</p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
                        <span className="h-4 w-4 rounded-full border border-ink/20" style={{ background: l.hex ?? "#ddd" }} aria-hidden />
                        {l.variantName}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {money(l.unit)} each
                        {l.compareAt != null && <s className="ml-2">{money(l.compareAt)}</s>}
                      </p>
                    </div>
                    <p className="text-lg">{money(l.unit * l.quantity)}</p>
                  </div>
                  {over && (
                    <p role="alert" className="mt-2 text-sm text-red-700">
                      {l.stock <= 0 ? "This color is sold out." : `Only ${l.stock} left.`}{" "}
                      <button type="button" className="underline" onClick={() => setQuantity(l.variantId, Math.max(0, l.stock))}>
                        {l.stock <= 0 ? "Remove" : "Update quantity"}
                      </button>
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="inline-flex min-h-[44px] items-center rounded-full border border-ink/20" role="group" aria-label={`Quantity for ${l.productName} ${l.variantName}`}>
                      <button type="button" className="h-full w-11 rounded-full text-xl hover:bg-linen" aria-label="Decrease quantity" onClick={() => setQuantity(l.variantId, l.quantity - 1)}>
                        −
                      </button>
                      <output className="min-w-8 text-center" aria-live="polite">{l.quantity}</output>
                      <button type="button" className="h-full w-11 rounded-full text-xl hover:bg-linen disabled:opacity-40" aria-label="Increase quantity" disabled={l.quantity >= l.stock} onClick={() => setQuantity(l.variantId, l.quantity + 1)}>
                        +
                      </button>
                    </div>
                    <button type="button" className="text-sm text-ink-soft underline hover:text-ink" onClick={() => remove(l.variantId)}>
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <Link href="/shop" className="mt-6 inline-block text-sm underline">
          Continue shopping
        </Link>
      </div>

      <aside className="h-fit rounded-md bg-linen p-6 lg:sticky lg:top-28" aria-labelledby="summary-h">
        <h2 id="summary-h" className="text-3xl">Order summary</h2>
        <dl className="mt-5 space-y-2">
          <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{money(subtotal)}</dd></div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Delivery</dt>
            <dd>{delivery.is_enabled ? (fee === 0 ? "Free" : money(fee)) : "Unavailable"}</dd>
          </div>
          <div className="mt-3 flex justify-between border-t border-ink/15 pt-3 text-lg font-normal">
            <dt>Total</dt>
            <dd>{money(subtotal + (delivery.is_enabled ? fee : 0))}</dd>
          </div>
        </dl>
        {feeVaries && <p className="mt-3 text-xs text-ink-soft">The delivery fee is confirmed once you choose your region at checkout.</p>}
        {delivery.free_delivery_threshold != null && fee > 0 && subtotal < delivery.free_delivery_threshold && (
          <p className="mt-3 text-xs text-ink-soft">Add {money(delivery.free_delivery_threshold - subtotal)} more for free delivery.</p>
        )}
        {!delivery.is_enabled && <p className="mt-3 text-sm text-red-700">Delivery is currently unavailable.</p>}
        {blocked ? (
          <button type="button" className="btn btn-primary mt-6 w-full" disabled>
            Checkout
          </button>
        ) : (
          <Link href="/checkout" className="btn btn-primary mt-6 w-full">
            Checkout
          </Link>
        )}
      </aside>
    </div>
  );
}
