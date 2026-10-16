"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { reorderRows } from "@/lib/reorder";
import { parseSpecs } from "@/lib/specs";
import { BUCKETS } from "@/lib/storage";
import { bool, num, optNum, optStr, slugify, str } from "@/lib/utils";

const HEX = /^#[0-9a-f]{6}$/i;

function dbMessage(error: { message: string; code?: string }): string {
  if (error.code === "23505") {
    if (error.message.includes("slug")) return "Another product already uses this URL name (slug).";
    if (error.message.includes("sku")) return "This SKU is already used by another product or color.";
    if (error.message.includes("product_id_name") || error.message.includes("name")) return "This product already has a color with that name.";
    return "That value is already in use.";
  }
  if (error.code === "23514") return "One of the values is not allowed (check prices: the sale price cannot be higher than the price).";
  return error.message;
}

/* ------------------------------------------------------------------ products */

export async function createProduct(fd: FormData) {
  const { supabase } = await requireAdmin();
  const name = str(fd, "name");
  if (!name) flash("/admin/products/new", "error", "Enter a product name.");
  const slug = slugify(str(fd, "slug") || name);
  if (!slug) flash("/admin/products/new", "error", "Enter a valid URL name.");

  const { data: last } = await supabase.from("products").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const { data, error } = await supabase
    .from("products")
    .insert({ name, slug, price: num(fd, "price"), status: "draft", sort_order: (last?.[0]?.sort_order ?? 0) + 10 })
    .select("id")
    .single();
  if (error || !data) flash("/admin/products/new", "error", dbMessage(error!));

  // Every product starts with one colour so it can be bought straight away.
  await supabase.from("product_variants").insert({ product_id: data!.id, name: "Default", sort_order: 10 });
  flash(`/admin/products/${data!.id}`, "ok", "Product created as a draft. Add colors, photos and stock, then set it to Active.");
}

export async function updateProduct(id: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const path = `/admin/products/${id}`;
  const name = str(fd, "name");
  if (!name) flash(path, "error", "Enter a product name.");
  const slug = slugify(str(fd, "slug") || name);
  const price = num(fd, "price");
  const sale = optNum(fd, "sale_price");
  if (sale != null && sale > price) flash(path, "error", "The sale price cannot be higher than the price.");
  const status = str(fd, "status");
  if (!["active", "draft", "archived"].includes(status)) flash(path, "error", "Choose a valid status.");

  const { error } = await supabase
    .from("products")
    .update({
      name,
      slug,
      short_description: optStr(fd, "short_description"),
      description: optStr(fd, "description"),
      price,
      sale_price: sale,
      sku: optStr(fd, "sku"),
      status,
      category_id: optStr(fd, "category_id"),
      specs: parseSpecs(str(fd, "specs")),
      seo_title: optStr(fd, "seo_title"),
      seo_description: optStr(fd, "seo_description"),
    })
    .eq("id", id);
  if (error) flash(path, "error", dbMessage(error));
  revalidatePath("/", "layout");
  flash(path, "ok", "Product saved.");
}

export async function deleteProduct(id: string) {
  const { supabase } = await requireAdmin();
  const { data: images } = await supabase.from("product_images").select("storage_path").eq("product_id", id);
  const paths = (images ?? []).map((i) => i.storage_path);
  if (paths.length) await supabase.storage.from(BUCKETS.products).remove(paths);
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) flash(`/admin/products/${id}`, "error", dbMessage(error));
  revalidatePath("/", "layout");
  redirect("/admin/products?ok=" + encodeURIComponent("Product deleted. Past orders keep their details."));
}

/* ------------------------------------------------------------- colours / variants */

function variantFields(fd: FormData, path: string) {
  const name = str(fd, "name");
  if (!name) flash(path, "error", "Enter a color name.");
  const hex = str(fd, "hex_color");
  if (hex && !HEX.test(hex)) flash(path, "error", "The color code must look like #c9b79c.");
  const price = optNum(fd, "price");
  const sale = optNum(fd, "sale_price");
  if (price != null && sale != null && sale > price) flash(path, "error", "The sale price cannot be higher than the price.");
  const stock = Math.floor(num(fd, "stock"));
  if (stock < 0) flash(path, "error", "Stock cannot be negative.");
  return { name, hex_color: hex || null, sku: optStr(fd, "sku"), price, sale_price: sale, stock };
}

export async function addVariant(productId: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const path = `/admin/products/${productId}`;
  const f = variantFields(fd, path);
  const { data: last } = await supabase.from("product_variants").select("sort_order").eq("product_id", productId).order("sort_order", { ascending: false }).limit(1);
  const { data, error } = await supabase
    .from("product_variants")
    .insert({ product_id: productId, name: f.name, hex_color: f.hex_color, sku: f.sku, price: f.price, sale_price: f.sale_price, is_active: true, sort_order: (last?.[0]?.sort_order ?? 0) + 10 })
    .select("id")
    .single();
  if (error || !data) flash(path, "error", dbMessage(error!));
  if (f.stock > 0) await supabase.rpc("admin_adjust_inventory", { p_variant_id: data!.id, p_quantity: f.stock, p_note: "Initial stock" });
  revalidatePath("/", "layout");
  flash(path, "ok", `Color "${f.name}" added. It appears on the website once the product is Active.`);
}

export async function updateVariant(productId: string, variantId: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const path = `/admin/products/${productId}`;
  const f = variantFields(fd, path);
  const { error } = await supabase
    .from("product_variants")
    .update({ name: f.name, hex_color: f.hex_color, sku: f.sku, price: f.price, sale_price: f.sale_price, is_active: bool(fd, "is_active") })
    .eq("id", variantId);
  if (error) flash(path, "error", dbMessage(error));
  const { error: invError } = await supabase.rpc("admin_adjust_inventory", {
    p_variant_id: variantId,
    p_quantity: f.stock,
    p_note: "Edited in product page",
    p_low_threshold: Math.max(0, Math.floor(num(fd, "low_stock_threshold", 5))),
  });
  if (invError) flash(path, "error", invError.message);
  revalidatePath("/", "layout");
  flash(path, "ok", `Color "${f.name}" saved.`);
}

export async function deleteVariant(productId: string, variantId: string) {
  const { supabase } = await requireAdmin();
  const path = `/admin/products/${productId}`;
  const { data: images } = await supabase.from("product_images").select("storage_path").eq("variant_id", variantId);
  const paths = (images ?? []).map((i) => i.storage_path);
  if (paths.length) await supabase.storage.from(BUCKETS.products).remove(paths);
  const { error } = await supabase.from("product_variants").delete().eq("id", variantId);
  if (error) flash(path, "error", dbMessage(error));
  revalidatePath("/", "layout");
  flash(path, "ok", "Color deleted.");
}

export async function moveVariant(productId: string, variantId: string, dir: "up" | "down") {
  const { supabase } = await requireAdmin();
  try {
    await reorderRows(supabase, "product_variants", (q) => q.eq("product_id", productId), variantId, dir);
  } catch (e: any) {
    flash(`/admin/products/${productId}`, "error", e.message);
  }
  revalidatePath("/", "layout");
  redirect(`/admin/products/${productId}`);
}

/* ---------------------------------------------------------------- images (called from the browser) */

type Result = { ok: true } | { ok: false; error: string };
const fail = (e: any): Result => ({ ok: false, error: e?.message ?? "Something went wrong." });

function scope(q: any, productId: string, variantId: string | null) {
  const s = q.eq("product_id", productId);
  return variantId ? s.eq("variant_id", variantId) : s.is("variant_id", null);
}

export async function registerProductImages(productId: string, variantId: string | null, paths: string[]): Promise<Result> {
  try {
    const { supabase } = await requireAdmin();
    const { data: existing } = await scope(supabase.from("product_images").select("sort_order, is_featured"), productId, variantId);
    let next = Math.max(0, ...(existing ?? []).map((r: any) => r.sort_order)) + 10;
    let hasFeatured = (existing ?? []).some((r: any) => r.is_featured);
    const rows = paths.map((p) => {
      const row = { product_id: productId, variant_id: variantId, storage_path: p, sort_order: next, is_featured: !hasFeatured };
      next += 10;
      hasFeatured = true;
      return row;
    });
    const { error } = await supabase.from("product_images").insert(rows);
    if (error) return fail(error);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProductImage(imageId: string): Promise<Result> {
  try {
    const { supabase } = await requireAdmin();
    const { data: img } = await supabase.from("product_images").select("*").eq("id", imageId).maybeSingle();
    if (!img) return { ok: true };
    await supabase.storage.from(BUCKETS.products).remove([img.storage_path]);
    const { error } = await supabase.from("product_images").delete().eq("id", imageId);
    if (error) return fail(error);
    // keep one featured image in this scope
    const { data: rest } = await scope(supabase.from("product_images").select("id, is_featured").order("sort_order"), img.product_id, img.variant_id);
    if (rest?.length && !rest.some((r: any) => r.is_featured)) await supabase.from("product_images").update({ is_featured: true }).eq("id", rest[0].id);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function moveProductImage(imageId: string, dir: "up" | "down"): Promise<Result> {
  try {
    const { supabase } = await requireAdmin();
    const { data: img } = await supabase.from("product_images").select("product_id, variant_id").eq("id", imageId).maybeSingle();
    if (!img) return { ok: true };
    await reorderRows(supabase, "product_images", (q) => scope(q, img.product_id, img.variant_id), imageId, dir);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setFeaturedImage(imageId: string): Promise<Result> {
  try {
    const { supabase } = await requireAdmin();
    const { data: img } = await supabase.from("product_images").select("product_id, variant_id").eq("id", imageId).maybeSingle();
    if (!img) return { ok: true };
    await scope(supabase.from("product_images").update({ is_featured: false }), img.product_id, img.variant_id);
    const { error } = await supabase.from("product_images").update({ is_featured: true }).eq("id", imageId);
    if (error) return fail(error);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function replaceProductImage(imageId: string, newPath: string): Promise<Result> {
  try {
    const { supabase } = await requireAdmin();
    const { data: img } = await supabase.from("product_images").select("storage_path").eq("id", imageId).maybeSingle();
    if (!img) return { ok: false, error: "Image not found." };
    const { error } = await supabase.from("product_images").update({ storage_path: newPath }).eq("id", imageId);
    if (error) return fail(error);
    await supabase.storage.from(BUCKETS.products).remove([img.storage_path]);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateImageAlt(imageId: string, alt: string): Promise<Result> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("product_images").update({ alt_text: alt.trim() || null }).eq("id", imageId);
    if (error) return fail(error);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
