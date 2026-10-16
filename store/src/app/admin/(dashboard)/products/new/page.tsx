import { Card, Flash, Field, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { createProduct } from "../actions";

export const metadata = { title: "New product" };

export default async function NewProduct({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Add product" />
      <Flash ok={sp.ok} error={sp.error} />
      <Card className="max-w-xl">
        <form action={createProduct} className="space-y-4">
          <Field label="Product name"><input name="name" required className="input" /></Field>
          <Field label="URL name (slug)" hint="Optional. Letters, numbers and dashes. Generated from the name if empty.">
            <input name="slug" className="input" />
          </Field>
          <Field label="Price"><input name="price" type="number" step="0.01" min="0" defaultValue="0" className="input" /></Field>
          <p className="text-sm text-neutral-500">The product starts as a draft with one color called &quot;Default&quot;. You can rename it, add more colors, upload photos and set stock on the next screen.</p>
          <button className="btn btn-primary">Create product</button>
        </form>
      </Card>
    </>
  );
}
