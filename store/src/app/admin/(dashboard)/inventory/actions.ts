"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { num, optStr } from "@/lib/utils";

export async function adjustStock(variantId: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const qty = Math.floor(num(fd, "quantity", -1));
  if (qty < 0) flash("/admin/inventory", "error", "Enter a stock number of 0 or more.");
  const { error } = await supabase.rpc("admin_adjust_inventory", {
    p_variant_id: variantId,
    p_quantity: qty,
    p_note: optStr(fd, "note"),
    p_low_threshold: Math.max(0, Math.floor(num(fd, "low_stock_threshold", 5))),
  });
  if (error) flash("/admin/inventory", "error", error.message);
  revalidatePath("/", "layout");
  flash("/admin/inventory", "ok", "Stock updated.");
}
