"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { optStr, str } from "@/lib/utils";

export async function updateOrderStatus(orderId: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const path = `/admin/orders/${orderId}`;
  const { error } = await supabase.rpc("admin_update_order_status", {
    p_order_id: orderId,
    p_status: str(fd, "status"),
    p_note: optStr(fd, "note"),
  });
  if (error) flash(path, "error", error.message);
  revalidatePath("/admin", "layout");
  flash(path, "ok", "Order status updated.");
}

export async function updateOrderDetails(orderId: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const path = `/admin/orders/${orderId}`;
  const payment = str(fd, "payment_status");
  if (!["unpaid", "paid", "refunded"].includes(payment)) flash(path, "error", "Invalid payment status.");
  const { error } = await supabase.from("orders").update({ payment_status: payment, admin_notes: optStr(fd, "admin_notes") }).eq("id", orderId);
  if (error) flash(path, "error", error.message);
  flash(path, "ok", "Order saved.");
}
