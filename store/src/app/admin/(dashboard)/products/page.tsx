import Link from "next/link";
import { Flash, LinkButton, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/pricing";
import { currencyOf, getSettings } from "@/lib/settings";
import { BUCKETS, publicUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export const metadata = { title: "Products" };

const STATUS_COLOR: Record<string, string> = { active: "#2f855a", draft: "#b7791f", archived: "#6b7280" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const currency = currencyOf(await getSettings());
  const filter = typeof sp.status === "string" ? sp.status : "all";

  let q = supabase
    .from("products")
    .select("id, name, slug, status, price, sale_price, product_variants(id, is_active, inventory(quantity)), product_images(storage_path, variant_id, is_featured, sort_order)")
    .order("sort_order")
    .order("created_at");
  if (["active", "draft", "archived"].includes(filter)) q = q.eq("status", filter);
  const { data: products } = await q;

  return (
    <>
      <PageHeader title="Products">
        <LinkButton href="/admin/products/new" variant="primary">Add product</LinkButton>
      </PageHeader>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="mb-4 flex gap-2 text-sm">
        {["all", "active", "draft", "archived"].map((s) => (
          <Link key={s} href={s === "all" ? "/admin/products" : `/admin/products?status=${s}`} className={cn("rounded-full border px-3 py-1 capitalize", filter === s ? "border-lagoon bg-lagoon text-white" : "border-neutral-300 hover:border-neutral-500")}>
            {s}
          </Link>
        ))}
      </div>

      <Table head={["", "Product", "Status", "Price", "Colors", "Stock"]} empty="No products yet. Click Add product to create one.">
        {(products ?? []).map((p: any) => {
          const variants: any[] = p.product_variants ?? [];
          const stock = variants.reduce((n, v) => n + ((Array.isArray(v.inventory) ? v.inventory[0] : v.inventory)?.quantity ?? 0), 0);
          const imgs: any[] = [...(p.product_images ?? [])].sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.sort_order - b.sort_order);
          const cover = publicUrl(BUCKETS.products, imgs[0]?.storage_path);
          return (
            <tr key={p.id} className="hover:bg-neutral-50">
              <td className="w-16 px-4 py-2">
                {cover ? <img src={cover} alt="" className="h-14 w-12 rounded object-cover" /> : <div className="h-14 w-12 rounded bg-neutral-100" />}
              </td>
              <td className="px-4 py-2">
                <Link href={`/admin/products/${p.id}`} className="font-medium underline">{p.name}</Link>
                <p className="text-xs text-neutral-500">/{p.slug}</p>
              </td>
              <td className="px-4 py-2"><StatusBadge label={p.status} color={STATUS_COLOR[p.status]} /></td>
              <td className="px-4 py-2">
                {p.sale_price != null ? <><span>{formatMoney(Number(p.sale_price), currency)}</span> <s className="text-neutral-400">{formatMoney(Number(p.price), currency)}</s></> : formatMoney(Number(p.price), currency)}
              </td>
              <td className="px-4 py-2">{variants.filter((v) => v.is_active).length} active{variants.length > variants.filter((v) => v.is_active).length && ` / ${variants.length}`}</td>
              <td className="px-4 py-2">{stock}</td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
