import type { Metadata } from "next";
import { SectionRenderer } from "@/components/site/SectionRenderer";
import { getPage } from "@/lib/pages";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("home");
  return { title: page?.seo_title || undefined, description: page?.seo_description || undefined };
}

export default async function HomePage() {
  const [page, settings] = await Promise.all([getPage("home"), getSettings()]);
  return <SectionRenderer sections={page?.sections ?? []} settings={settings} />;
}
