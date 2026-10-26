import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Call at the top of every admin page and server action. Cached, so layout and page share one check per request. */
export const requireAdmin = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase.from("admins").select("user_id, role").eq("user_id", user.id).maybeSingle();
  if (!admin) redirect("/admin/login?error=unauthorized");

  return { supabase, user, role: admin.role as string };
});
