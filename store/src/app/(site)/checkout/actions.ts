"use server";
import { getPaymentProvider } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";

export interface PlaceOrderInput {
  customer: { full_name: string; phone: string; email: string; city: string; address: string; notes: string };
  items: { variant_id: string; quantity: number }[];
  region_id: string;
  payment_method: string;
  discount_code: string;
  website?: string; // honeypot: real visitors leave it empty
}

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; redirectUrl?: string }
  | { ok: false; error: string };

/**
 * Creates the order through the database function public.place_order.
 * The browser never sends prices: the function recalculates everything from the database.
 */
export async function placeOrderAction(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (input.website) return { ok: false, error: "We couldn't place your order. Please try again." };
  if (!Array.isArray(input.items) || input.items.length === 0) return { ok: false, error: "Your cart is empty." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_customer: {
      full_name: input.customer.full_name,
      phone: input.customer.phone,
      email: input.customer.email,
      city: input.customer.city,
      address: input.customer.address,
      notes: input.customer.notes,
    },
    p_items: input.items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })),
    p_region_id: input.region_id || null,
    p_payment_method: input.payment_method || "cod",
    p_discount_code: input.discount_code || null,
  });

  if (error || typeof data !== "string") {
    // Messages raised by place_order (code P0001) are written for customers; anything else is generic.
    const friendly = error?.code === "P0001" ? error.message : "We couldn't place your order. Please try again.";
    return { ok: false, error: friendly };
  }

  const orderNumber = data;
  const { data: method } = await supabase.from("payment_methods").select("provider").eq("key", input.payment_method || "cod").maybeSingle();
  const { data: order } = await supabase.rpc("get_order_public", { p_number: orderNumber });
  const action = await getPaymentProvider(method?.provider ?? "cod").start({
    orderNumber,
    total: Number(order?.total ?? 0),
    currency: String(order?.currency ?? "USD"),
  });

  return { ok: true, orderNumber, redirectUrl: action.kind === "redirect" ? action.url : undefined };
}
