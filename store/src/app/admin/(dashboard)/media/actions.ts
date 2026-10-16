"use server";
import { requireAdmin } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { BUCKETS } from "@/lib/storage";

export async function deleteMedia(id: string) {
  const { supabase } = await requireAdmin();
  const { data: m } = await supabase.from("media").select("path").eq("id", id).maybeSingle();
  if (m) await supabase.storage.from(BUCKETS.site).remove([m.path]);
  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) flash("/admin/media", "error", error.message);
  flash("/admin/media", "ok", "File deleted. Any section still pointing to it will show a placeholder.");
}
