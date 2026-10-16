"use server";
import { requireAdmin } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { optStr } from "@/lib/utils";

export async function saveCustomerNotes(id: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("customers").update({ notes: optStr(fd, "notes") }).eq("id", id);
  if (error) flash(`/admin/customers/${id}`, "error", error.message);
  flash(`/admin/customers/${id}`, "ok", "Notes saved.");
}
