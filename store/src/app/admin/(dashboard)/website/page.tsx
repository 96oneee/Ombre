import Link from "next/link";
import { Card, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Website" };

export default async function WebsitePages() {
  const { supabase } = await requireAdmin();
  const { data: pages } = await supabase.from("pages").select("id, slug, title, is_published, page_sections(id)").order("slug");
  return (
    <>
      <PageHeader title="Website" />
      <p className="mb-6 max-w-2xl text-sm text-neutral-600">Each page is built from sections. Pick a page to edit its text, images and buttons, show or hide sections, and change their order.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {(pages ?? []).map((p: any) => (
          <Card key={p.id}>
            <h2 className="font-body text-lg font-medium">{p.title}</h2>
            <p className="mt-1 text-sm text-neutral-500">{p.page_sections?.length ?? 0} sections · {p.is_published ? "Published" : "Not published"}</p>
            <div className="mt-4 flex gap-2">
              <Link href={`/admin/website/${p.slug}`} className="btn btn-primary btn-sm">Edit page</Link>
              <Link href={p.slug === "home" ? "/" : `/${p.slug}`} target="_blank" className="btn btn-outline btn-sm">View</Link>
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-sm text-neutral-500">The Product, Shop, Cart and Checkout pages are generated from your products and settings.</p>
    </>
  );
}
