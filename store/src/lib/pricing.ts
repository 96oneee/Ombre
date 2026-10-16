// Pure pricing helpers. The same rules live in SQL inside public.place_order(),
// which is the source of truth: the browser only uses these for previews.
import type { Currency, DeliveryRegion, DeliverySettings } from "./types";

interface PriceRow {
  price: number | null;
  sale_price: number | null;
}

/** Price of a colour: its own price overrides the product price; sale price applies if lower. */
export function variantPrice(variant: PriceRow, product: PriceRow): { unit: number; compareAt: number | null } {
  const list = variant.price ?? product.price ?? 0;
  const sale = variant.sale_price ?? (variant.price == null ? product.sale_price : null);
  if (sale != null && sale < list) return { unit: sale, compareAt: list };
  return { unit: list, compareAt: null };
}

export function deliveryFee(
  settings: DeliverySettings,
  region: Pick<DeliveryRegion, "fee_override"> | null,
  subtotalAfterDiscount: number,
): number {
  let fee = region?.fee_override ?? settings.flat_fee;
  if (settings.free_delivery_threshold != null && subtotalAfterDiscount >= settings.free_delivery_threshold) fee = 0;
  return round2(fee);
}

export function discountAmount(type: "percentage" | "fixed", value: number, subtotal: number): number {
  return round2(type === "percentage" ? (subtotal * value) / 100 : Math.min(value, subtotal));
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatMoney(amount: number, currency: Currency): string {
  const n = round2(amount);
  const text = n.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return currency.position === "after" ? `${text} ${currency.symbol}` : `${currency.symbol}${text}`;
}
