import Link from "next/link";
import { notFound } from "next/navigation";
import { ColorInput } from "@/components/admin/ColorInput";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ImageManager, type ManagedImage } from "@/components/admin/ImageManager";
import { Card, Field, Flash, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { specsToText } from "@/lib/specs";
import { BUCKETS, publicUrl } from "@/lib/storage";
import { addVariant, deleteProduct, deleteVariant, moveVariant, updateProduct, updateVariant } from "../actions";

export const metadata = { title: "Edit product" };

const toManaged = (rows: any[]): ManagedImage[] =>
  [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({ id: r.id, url: publicUrl(BUCKETS.products, r.storage_path) ?? "", alt_text: r.alt_text, is_featured: r.is_featured }));

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("*, product_variants(*, inventory(quantity, low_stock_threshold)), product_images(*)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, name").order("name"),
  ]);
  if (!product) notFound();

  const variants = [...(product.product_variants ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
  const images: any[] = product.product_images ?? [];
  const inv = (v: any) => (Array.isArray(v.inventory) ? v.inventory[0] : v.inventory);

  return (
    <>
      <PageHeader title={product.name}>
        {product.status === "active" && <Link href={`/product/${product.slug}`} target="_blank" className="btn btn-outline btn-sm">View on site</Link>}
        <Link href="/admin/products" className="btn btn-outline btn-sm">All products</Link>
      </PageHeader>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="space-y-6">
        {/* ------------------------------------------------ details */}
        <Card title="Product details">
          <form action={updateProduct.bind(null, id)} className="grid gap-4 md:grid-cols-2">
            <Field label="Name"><input name="name" defaultValue={product.name} required className="input" /></Field>
            <Field label="URL name (slug)" hint="Used in the address: /product/your-slug"><input name="slug" defaultValue={product.slug} className="input" /></Field>
            <Field label="Status" hint="Only Active products appear on the website.">
              <select name="status" defaultValue={product.status} className="input">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field label="Category">
              <select name="category_id" defaultValue={product.category_id ?? ""} className="input">
                <option value="">None</option>
                {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Price"><input name="price" type="number" step="0.01" min="0" defaultValue={product.price} className="input" /></Field>
            <Field label="Sale price" hint="Leave empty for no sale. Colors can have their own price below."><input name="sale_price" type="number" step="0.01" min="0" defaultValue={product.sale_price ?? ""} className="input" /></Field>
            <Field label="SKU"><input name="sku" defaultValue={product.sku ?? ""} className="input" /></Field>
            <div />
            <div className="md:col-span-2"><Field label="Short description"><input name="short_description" defaultValue={product.short_description ?? ""} className="input" /></Field></div>
            <div className="md:col-span-2"><Field label="Full description" hint="Leave a blank line between paragraphs."><textarea name="description" defaultValue={product.description ?? ""} rows={6} className="input" /></Field></div>
            <div className="md:col-span-2">
              <Field label="Specifications" hint="One per line, written as Label: Value. For example  Dimensions: 50 x 50 cm">
                <textarea name="specs" defaultValue={specsToText(product.specs)} rows={4} className="input font-mono text-sm" />
              </Field>
            </div>
            <Field label="SEO title"><input name="seo_title" defaultValue={product.seo_title ?? ""} className="input" /></Field>
            <Field label="SEO description"><input name="seo_description" defaultValue={product.seo_description ?? ""} className="input" /></Field>
            <div className="md:col-span-2"><button className="btn btn-primary">Save product</button></div>
          </form>
        </Card>

        {/* ------------------------------------------------ colours */}
        <div>
          <h2 className="mb-1 text-lg font-medium">Colors</h2>
          <p className="mb-4 text-sm text-neutral-500">Each color is a separate option for customers with its own photos, price and stock. On the website each active color gets its own gallery.</p>
          <div className="space-y-6">
            {variants.map((v: any, i: number) => {
              const stock = inv(v);
              return (
                <Card key={v.id}>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full border border-neutral-300" style={{ background: v.hex_color ?? "#eee" }} />
                    <h3 className="font-body text-base font-medium tracking-normal">{v.name}</h3>
                    {!v.is_active && <span className="badge bg-neutral-200 text-neutral-600">Hidden</span>}
                  </div>
                  <form action={updateVariant.bind(null, id, v.id)} className="grid gap-4 md:grid-cols-3">
                    <Field label="Color name"><input name="name" defaultValue={v.name} required className="input" /></Field>
                    <Field label="Color code"><ColorInput name="hex_color" defaultValue={v.hex_color ?? ""} /></Field>
                    <Field label="SKU"><input name="sku" defaultValue={v.sku ?? ""} className="input" /></Field>
                    <Field label="Price (optional)" hint="Empty = use the product price"><input name="price" type="number" step="0.01" min="0" defaultValue={v.price ?? ""} className="input" /></Field>
                    <Field label="Sale price (optional)"><input name="sale_price" type="number" step="0.01" min="0" defaultValue={v.sale_price ?? ""} className="input" /></Field>
                    <Field label="Stock"><input name="stock" type="number" step="1" min="0" defaultValue={stock?.quantity ?? 0} className="input" /></Field>
                    <Field label="Low stock warning at"><input name="low_stock_threshold" type="number" step="1" min="0" defaultValue={stock?.low_stock_threshold ?? 5} className="input" /></Field>
                    <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="is_active" defaultChecked={v.is_active} className="h-4 w-4 accent-[#227b92]" /> Show on website</label>
                    <div className="self-end"><button className="btn btn-primary btn-sm">Save color</button></div>
                  </form>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <form action={moveVariant.bind(null, id, v.id, "up")}><button className="btn btn-outline btn-sm" disabled={i === 0} aria-label={`Move ${v.name} up`}>Move up</button></form>
                    <form action={moveVariant.bind(null, id, v.id, "down")}><button className="btn btn-outline btn-sm" disabled={i === variants.length - 1} aria-label={`Move ${v.name} down`}>Move down</button></form>
                    <form action={deleteVariant.bind(null, id, v.id)}><ConfirmButton message={`Delete the color "${v.name}" and its photos?`} className="btn btn-danger btn-sm">Delete color</ConfirmButton></form>
                  </div>

                  <h4 className="mb-3 mt-6 text-sm font-medium">{v.name} photos</h4>
                  <ImageManager productId={id} variantId={v.id} images={toManaged(images.filter((im) => im.variant_id === v.id))} emptyHint={`No photos for ${v.name} yet. Customers will see the shared photos instead.`} />
                </Card>
              );
            })}
            {variants.length === 0 && <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">This product has no colors, so customers cannot buy it. Add one below.</p>}
          </div>
        </div>

        <Card title="Add a color">
          <form action={addVariant.bind(null, id)} className="grid gap-4 md:grid-cols-3">
            <Field label="Color name"><input name="name" required className="input" /></Field>
            <Field label="Color code"><ColorInput name="hex_color" /></Field>
            <Field label="SKU"><input name="sku" className="input" /></Field>
            <Field label="Price (optional)"><input name="price" type="number" step="0.01" min="0" className="input" /></Field>
            <Field label="Sale price (optional)"><input name="sale_price" type="number" step="0.01" min="0" className="input" /></Field>
            <Field label="Starting stock"><input name="stock" type="number" step="1" min="0" defaultValue="0" className="input" /></Field>
            <div className="md:col-span-3"><button className="btn btn-primary btn-sm">Add color</button> <span className="ml-2 text-sm text-neutral-500">You can upload its photos right after.</span></div>
          </form>
        </Card>

        <Card title="Shared photos (all colors)">
          <p className="mb-4 text-sm text-neutral-500">Photos that are not specific to one color. A color without its own photos shows these instead.</p>
          <ImageManager productId={id} variantId={null} images={toManaged(images.filter((im) => im.variant_id === null))} emptyHint="No shared photos." />
        </Card>

        <Card title="Danger zone" className="border-red-200">
          <p className="mb-3 text-sm text-neutral-600">Deleting removes the product, its colors and its photos. Past orders keep their details. To hide a product without deleting it, set its status to Archived.</p>
          <form action={deleteProduct.bind(null, id)}><ConfirmButton message="Delete this product, its colors and photos? This cannot be undone." className="btn btn-danger btn-sm">Delete product</ConfirmButton></form>
        </Card>
      </div>
    </>
  );
}
