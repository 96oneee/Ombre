import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEMO_DELIVERY, DEMO_SETTINGS } from "./demo";
import { hasSupabase } from "./supabase/env";
import type { Currency, DeliveryRegion, DeliverySettings } from "./types";

export interface SiteSettings {
  brand_name: string;
  logo_path: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  instagram_url: string;
  address: string;
  footer_text: string;
  copyright_text: string;
  announcement_enabled: boolean;
  announcement_text: string;
  currency_code: string;
  currency_symbol: string;
  currency_position: "before" | "after";
  site_url: string;
  site_language: string;
}

export const SETTING_DEFAULTS: SiteSettings = {
  brand_name: "Store",
  logo_path: "",
  contact_email: "",
  contact_phone: "",
  whatsapp_number: "",
  instagram_url: "",
  address: "",
  footer_text: "",
  copyright_text: "",
  announcement_enabled: false,
  announcement_text: "",
  currency_code: "USD",
  currency_symbol: "$",
  currency_position: "before",
  site_url: "",
  site_language: "en",
};

/** All site settings, merged over defaults. Cached per request. */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  if (!hasSupabase) return DEMO_SETTINGS;
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  const merged: Record<string, unknown> = { ...SETTING_DEFAULTS };
  for (const row of data ?? []) merged[row.key] = row.value;
  return merged as unknown as SiteSettings;
});

export function currencyOf(s: SiteSettings): Currency {
  return { code: s.currency_code, symbol: s.currency_symbol, position: s.currency_position === "after" ? "after" : "before" };
}

export const getDelivery = cache(async (): Promise<{ settings: DeliverySettings; regions: DeliveryRegion[] }> => {
  if (!hasSupabase) return DEMO_DELIVERY;
  const supabase = await createClient();
  const [{ data: s }, { data: r }] = await Promise.all([
    supabase.from("delivery_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("delivery_regions").select("*").eq("is_active", true).order("sort_order").order("name"),
  ]);
  const settings: DeliverySettings = {
    is_enabled: s?.is_enabled ?? false,
    flat_fee: Number(s?.flat_fee ?? 0),
    free_delivery_threshold: s?.free_delivery_threshold == null ? null : Number(s.free_delivery_threshold),
    notes: s?.notes ?? null,
  };
  const regions: DeliveryRegion[] = (r ?? []).map((x) => ({
    id: x.id,
    name: x.name,
    fee_override: x.fee_override == null ? null : Number(x.fee_override),
    is_active: x.is_active,
    sort_order: x.sort_order,
  }));
  return { settings, regions };
});

export interface PaymentMethodRow {
  key: string;
  label: string;
  description: string | null;
}

/** Active payment methods for the product and checkout pages. */
export const getPaymentMethods = cache(async (): Promise<PaymentMethodRow[]> => {
  if (!hasSupabase) return [{ key: "cod", label: "Cash on delivery", description: "Pay the driver in cash when your Ombre arrives." }];
  const supabase = await createClient();
  const { data } = await supabase.from("payment_methods").select("key, label, description").eq("is_active", true).order("sort_order");
  return (data ?? []) as PaymentMethodRow[];
});
