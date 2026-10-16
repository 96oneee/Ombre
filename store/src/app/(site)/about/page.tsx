import type { Metadata } from "next";
import { SectionRenderer } from "@/components/site/SectionRenderer";
import { getPage } from "@/lib/pages";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("about");
  return { title: page?.seo_title || "About", description: page?.seo_description || undefined };
}

export default async function AboutPage() {
  const [page, settings] = await Promise.all([getPage("about"), getSettings()]);
  return <SectionRenderer sections={page?.sections ?? []} settings={settings} />;
}
