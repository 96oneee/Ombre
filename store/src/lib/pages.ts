/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import type { PageSection } from "./types";

export interface PageData {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  sections: PageSection[];
}

export async function getPage(slug: string): Promise<PageData | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("id, slug, title, seo_title, seo_description, page_sections(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!data) return null;
  const sections = ((data as any).page_sections ?? [])
    .filter((s: PageSection) => s.is_visible)
    .sort((a: PageSection, b: PageSection) => a.sort_order - b.sort_order);
  return { ...(data as any), sections };
}
