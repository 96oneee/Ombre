"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { reorderRows } from "@/lib/reorder";
import { bool, digitsOnly, num, optNum, optStr, slugify, str } from "@/lib/utils";

const PATH = "/admin/settings";
const done = (msg: string) => {
  revalidatePath("/", "layout");
  flash(PATH, "ok", msg);
};

export async function saveSiteSettings(fd: FormData) {
  const { supabase } = await requireAdmin();

  const brand = str(fd, "brand_name");
  if (!brand) flash(PATH, "error", "Enter a brand name.");
  const position = str(fd, "currency_position");
  if (!["before", "after"].includes(position)) flash(PATH, "error", "Choose where the currency symbol goes.");
  const instagram = str(fd, "instagram_url");
  if (instagram && !/^https?:\/\//i.test(instagram)) flash(PATH, "error", "The Instagram link must start with https://");
  const currencyCode = str(fd, "currency_code").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) flash(PATH, "error", "The currency code must be 3 letters, for example USD.");
  const email = str(fd, "contact_email");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) flash(PATH, "error", "Enter a valid contact email.");

  const values: Record<string, unknown> = {
    brand_name: brand,
    logo_path: str(fd, "logo_path"),
    contact_email: email,
    contact_phone: str(fd, "contact_phone"),
    whatsapp_number: digitsOnly(str(fd, "whatsapp_number")),
    instagram_url: instagram,
    address: str(fd, "address"),
    footer_text: str(fd, "footer_text"),
    copyright_text: str(fd, "copyright_text"),
    announcement_enabled: bool(fd, "announcement_enabled"),
    announcement_text: str(fd, "announcement_text"),
    currency_code: currencyCode,
    currency_symbol: str(fd, "currency_symbol") || "$",
    currency_position: position,
    site_url: str(fd, "site_url").replace(/\/+$/, ""),
    site_language: str(fd, "site_language") || "en",
  };

  const { error } = await supabase.from("site_settings").upsert(Object.entries(values).map(([key, value]) => ({ key, value })), { onConflict: "key" });
  if (error) flash(PATH, "error", error.message);
  done("Settings saved.");
}

export async function saveDelivery(fd: FormData) {
  const { supabase } = await requireAdmin();
  const fee = num(fd, "flat_fee");
  const threshold = optNum(fd, "free_delivery_threshold");
  if (fee < 0 || (threshold != null && threshold < 0)) flash(PATH, "error", "Amounts cannot be negative.");
  const { error } = await supabase.from("delivery_settings").update({ is_enabled: bool(fd, "is_enabled"), flat_fee: fee, free_delivery_threshold: threshold, notes: optStr(fd, "notes") }).eq("id", 1);
  if (error) flash(PATH, "error", error.message);
  done("Delivery settings saved.");
}

export async function addRegion(fd: FormData) {
  const { supabase } = await requireAdmin();
  const name = str(fd, "name");
  if (!name) flash(PATH, "error", "Enter a region name.");
  const { data: last } = await supabase.from("delivery_regions").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const { error } = await supabase.from("delivery_regions").insert({ name, fee_override: optNum(fd, "fee_override"), is_active: true, sort_order: (last?.[0]?.sort_order ?? 0) + 10 });
  if (error) flash(PATH, "error", error.code === "23505" ? "A region with this name already exists." : error.message);
  done(`Region "${name}" added.`);
}

export async function updateRegion(id: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const name = str(fd, "name");
  if (!name) flash(PATH, "error", "Enter a region name.");
  const { error } = await supabase.from("delivery_regions").update({ name, fee_override: optNum(fd, "fee_override"), is_active: bool(fd, "is_active") }).eq("id", id);
  if (error) flash(PATH, "error", error.code === "23505" ? "A region with this name already exists." : error.message);
  done("Region saved.");
}

export async function deleteRegion(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("delivery_regions").delete().eq("id", id);
  if (error) flash(PATH, "error", error.message);
  done("Region deleted.");
}

export async function moveRegion(id: string, dir: "up" | "down") {
  const { supabase } = await requireAdmin();
  try {
    await reorderRows(supabase, "delivery_regions", (q) => q, id, dir, "name");
  } catch (e) {
    flash(PATH, "error", (e as Error).message);
  }
  done("Region moved.");
}

export async function setPaymentActive(key: string, active: boolean) {
  const { supabase } = await requireAdmin();
  if (!active) {
    const { count } = await supabase.from("payment_methods").select("key", { count: "exact", head: true }).eq("is_active", true);
    if ((count ?? 0) <= 1) flash(PATH, "error", "At least one payment method must stay active, or customers cannot check out.");
  }
  const { error } = await supabase.from("payment_methods").update({ is_active: active }).eq("key", key);
  if (error) flash(PATH, "error", error.message);
  done("Payment method updated.");
}

export async function saveStatus(key: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const label = str(fd, "label");
  const color = str(fd, "color");
  if (!label) flash(PATH, "error", "Enter a status name.");
  if (!/^#[0-9a-f]{6}$/i.test(color)) flash(PATH, "error", "The status color must look like #227b92.");
  const { error } = await supabase.from("order_statuses").update({ label, color, sort_order: Math.floor(num(fd, "sort_order")) }).eq("key", key);
  if (error) flash(PATH, "error", error.message);
  done("Status saved.");
}

export async function addStatus(fd: FormData) {
  const { supabase } = await requireAdmin();
  const label = str(fd, "label");
  const key = slugify(label).replace(/-/g, "_");
  if (!label || !key) flash(PATH, "error", "Enter a status name.");
  const { error } = await supabase.from("order_statuses").insert({ key, label, color: str(fd, "color") || "#6b7280", sort_order: Math.floor(num(fd, "sort_order", 100)) });
  if (error) flash(PATH, "error", error.code === "23505" ? "A status with this name already exists." : error.message);
  done(`Status "${label}" added.`);
}
