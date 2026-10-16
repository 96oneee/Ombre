"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { reorderRows } from "@/lib/reorder";
import { sectionDef } from "@/lib/sections";
import { BUCKETS } from "@/lib/storage";
import { optStr } from "@/lib/utils";

type Result = { ok: true; id?: string } | { ok: false; error: string };
const fail = (e: any): Result => ({ ok: false, error: e?.message ?? "Something went wrong." });

/** Keep only the fields this section type defines, with the right shapes. */
function clean(type: string, raw: Record<string, any>): Record<string, any> {
  const def = sectionDef(type);
  if (!def) throw new Error("Unknown section type.");
  const out: Record<string, any> = {};
  for (const f of def.fields) {
    const v = raw?.[f.key];
    if (f.type === "images") {
      out[f.key] = Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 24) : [];
    } else if (f.type === "select") {
      const allowed = (f.options ?? []).map((o) => o.value);
      out[f.key] = typeof v === "string" && allowed.includes(v) ? v : (def.defaults[f.key] as string);
    } else {
      out[f.key] = typeof v === "string" ? v.trim().slice(0, 5000) : "";
    }
  }
  return out;
}

function touch() {
  revalidatePath("/", "layout");
}

export async function saveSection(id: string, content: Record<string, any>): Promise<Result> {
  try {
    const { supabase } = await requireAdmin();
    const { data: s } = await supabase.from("page_sections").select("type").eq("id", id).maybeSingle();
    if (!s) return { ok: false, error: "Section not found." };
    const { error } = await supabase.from("page_sections").update({ content: clean(s.type, content) }).eq("id", id);
    if (error) return fail(error);
    touch();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setSectionVisible(id: string, visible: boolean): Promise<Result> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("page_sections").update({ is_visible: visible }).eq("id", id);
    if (error) return fail(error);
    touch();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function moveSection(id: string, dir: "up" | "down"): Promise<Result> {
  try {
    const { supabase } = await requireAdmin();
    const { data: s } = await supabase.from("page_sections").select("page_id").eq("id", id).maybeSingle();
    if (!s) return { ok: true };
    await reorderRows(supabase, "page_sections", (q) => q.eq("page_id", s.page_id), id, dir);
    touch();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteSection(id: string): Promise<Result> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("page_sections").delete().eq("id", id);
    if (error) return fail(error);
    touch();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function addSection(pageId: string, type: string): Promise<Result> {
  try {
    const { supabase } = await requireAdmin();
    const def = sectionDef(type);
    if (!def) return { ok: false, error: "Unknown section type." };
    const { data: last } = await supabase.from("page_sections").select("sort_order").eq("page_id", pageId).order("sort_order", { ascending: false }).limit(1);
    const { data, error } = await supabase
      .from("page_sections")
      .insert({ page_id: pageId, type, content: def.defaults, sort_order: (last?.[0]?.sort_order ?? 0) + 10, is_visible: true })
      .select("id")
      .single();
    if (error) return fail(error);
    touch();
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(e);
  }
}

export async function registerMedia(path: string, filename: string, mime: string, size: number): Promise<Result> {
  try {
    const { supabase, user } = await requireAdmin();
    const { error } = await supabase.from("media").insert({ bucket: BUCKETS.site, path, filename: filename.slice(0, 200), mime_type: mime, size_bytes: size, created_by: user.id });
    if (error) return fail(error);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function savePageMeta(pageId: string, slug: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const path = `/admin/website/${slug}`;
  const { error } = await supabase
    .from("pages")
    .update({ seo_title: optStr(fd, "seo_title"), seo_description: optStr(fd, "seo_description"), is_published: fd.get("is_published") === "on" })
    .eq("id", pageId);
  if (error) flash(path, "error", error.message);
  touch();
  flash(path, "ok", "Page settings saved.");
}
