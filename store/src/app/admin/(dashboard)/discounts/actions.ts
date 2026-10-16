"use server";
import { requireAdmin } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { optNum, optStr, str } from "@/lib/utils";

const PATH = "/admin/discounts";

function dateOrNull(fd: FormData, key: string): string | null {
  const v = optStr(fd, key);
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function createDiscount(fd: FormData) {
  const { supabase } = await requireAdmin();
  const code = str(fd, "code").toUpperCase().replace(/\s+/g, "");
  const type = str(fd, "type");
  const value = optNum(fd, "value");
  if (!code) flash(PATH, "error", "Enter a code.");
  if (!["percentage", "fixed"].includes(type)) flash(PATH, "error", "Choose a discount type.");
  if (value == null || value <= 0) flash(PATH, "error", "Enter a value greater than 0.");
  if (type === "percentage" && value! > 100) flash(PATH, "error", "A percentage cannot be more than 100.");
  const maxUses = optNum(fd, "max_uses");

  const { error } = await supabase.from("discounts").insert({
    code,
    description: optStr(fd, "description"),
    type,
    value,
    min_order: optNum(fd, "min_order") ?? 0,
    starts_at: dateOrNull(fd, "starts_at"),
    ends_at: dateOrNull(fd, "ends_at"),
    max_uses: maxUses && maxUses > 0 ? Math.floor(maxUses) : null,
    is_active: true,
  });
  if (error) flash(PATH, "error", error.code === "23505" ? "A discount with this code already exists." : error.code === "23514" ? "Check the dates: the end must be after the start." : error.message);
  flash(PATH, "ok", `Discount ${code} created.`);
}

export async function toggleDiscount(id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("discounts").update({ is_active: active }).eq("id", id);
  if (error) flash(PATH, "error", error.message);
  flash(PATH, "ok", active ? "Discount activated." : "Discount paused.");
}

export async function deleteDiscount(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("discounts").delete().eq("id", id);
  if (error) flash(PATH, "error", error.message);
  flash(PATH, "ok", "Discount deleted.");
}
