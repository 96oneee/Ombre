import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionEditor } from "@/components/admin/SectionEditor";
import { Card, Field, Flash, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { savePageMeta } from "../actions";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: page } = await supabase.from("pages").select("*, page_sections(*)").eq("slug", slug).maybeSingle();
  if (!page) notFound();
  const { data: products } = await supabase.from("products").select("id, name").neq("status", "archived").order("name");
  const sections = [...(page.page_sections ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);

  return (
    <>
      <PageHeader title={`${page.title} page`}>
        <Link href={slug === "home" ? "/" : `/${slug}`} target="_blank" className="btn btn-outline btn-sm">View page</Link>
        <Link href="/admin/website" className="btn btn-outline btn-sm">All pages</Link>
      </PageHeader>
      <Flash ok={sp.ok} error={sp.error} />
      <SectionEditor pageId={page.id} sections={sections} products={products ?? []} />

      <Card title="Page settings" className="mt-8">
        <form action={savePageMeta.bind(null, page.id, slug)} className="grid gap-4 md:grid-cols-2">
          <Field label="SEO title"><input name="seo_title" defaultValue={page.seo_title ?? ""} className="input" /></Field>
          <Field label="SEO description"><input name="seo_description" defaultValue={page.seo_description ?? ""} className="input" /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={page.is_published} className="h-4 w-4 accent-[#227b92]" /> Published</label>
          <div className="md:col-span-2"><button className="btn btn-outline btn-sm">Save page settings</button></div>
        </form>
      </Card>
    </>
  );
}
