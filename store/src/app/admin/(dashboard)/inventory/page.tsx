import Link from "next/link";
import { Flash, PageHeader, Table } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { adjustStock } from "./actions";

export const metadata = { title: "Inventory" };

const REASONS: Record<string, string> = {
  order: "Order",
  cancel_restock: "Order cancelled, restocked",
  reopen: "Order re-opened",
  manual: "Manual change",
  initial: "Initial stock",
};

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const lowOnly = sp.filter === "low";

  const [{ data: rows }, { data: moves }] = await Promise.all([
    supabase.from("product_variants").select("id, name, sku, is_active, products(name, status), inventory(quantity, low_stock_threshold)").order("created_at"),
    supabase.from("inventory_movements").select("id, change, quantity_after, reason, note, created_at, order_id, product_variants(name, products(name))").order("created_at", { ascending: false }).limit(40),
  ]);

  const list = (rows ?? [])
    .map((r: any) => {
      const inv = Array.isArray(r.inventory) ? r.inventory[0] : r.inventory;
      const p = Array.isArray(r.products) ? r.products[0] : r.products;
      return { id: r.id as string, name: r.name as string, sku: r.sku as string | null, active: r.is_active as boolean, product: p?.name as string, qty: (inv?.quantity ?? 0) as number, low: (inv?.low_stock_threshold ?? 5) as number };
    })
    .sort((a, b) => a.product.localeCompare(b.product) || a.name.localeCompare(b.name))
    .filter((r) => !lowOnly || r.qty <= r.low);

  return (
    <>
      <PageHeader title="Inventory" />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="mb-4 flex gap-2 text-sm">
        <Link href="/admin/inventory" className={cn("rounded-full border px-3 py-1", !lowOnly ? "border-lagoon bg-lagoon text-white" : "border-neutral-300")}>All</Link>
        <Link href="/admin/inventory?filter=low" className={cn("rounded-full border px-3 py-1", lowOnly ? "border-lagoon bg-lagoon text-white" : "border-neutral-300")}>Low or out of stock</Link>
      </div>

      <Table head={["Product", "Color", "SKU", "Stock", "Warn at", "Note", ""]} empty="No products or colors yet.">
        {list.map((r) => (
          <tr key={r.id} className={cn(!r.active && "opacity-60")}>
            <td className="px-4 py-2">{r.product}</td>
            <td className="px-4 py-2">{r.name}{!r.active && <span className="ml-2 text-xs text-neutral-500">(hidden)</span>}</td>
            <td className="px-4 py-2 text-neutral-500">{r.sku ?? "—"}</td>
            <td colSpan={4} className="px-4 py-2">
              <form action={adjustStock.bind(null, r.id)} className="flex flex-wrap items-center gap-2">
                <input name="quantity" type="number" min="0" step="1" defaultValue={r.qty} aria-label={`Stock for ${r.product} ${r.name}`} className={cn("input !min-h-[36px] w-24 !py-1", r.qty === 0 ? "border-red-400" : r.qty <= r.low && "border-amber-400")} />
                <input name="low_stock_threshold" type="number" min="0" step="1" defaultValue={r.low} aria-label="Low stock warning level" className="input !min-h-[36px] w-20 !py-1" />
                <input name="note" placeholder="Note (optional)" className="input !min-h-[36px] w-48 !py-1" />
                <button className="btn btn-outline btn-sm">Save</button>
                {r.qty === 0 ? <span className="badge bg-red-100 text-red-700">Out of stock</span> : r.qty <= r.low ? <span className="badge bg-amber-100 text-amber-800">Low</span> : null}
              </form>
            </td>
          </tr>
        ))}
      </Table>

      <h2 className="mb-3 mt-10 text-lg font-medium">Recent stock movements</h2>
      <Table head={["When", "Product", "Change", "New stock", "Reason"]} empty="No movements yet.">
        {(moves ?? []).map((m: any) => {
          const v = Array.isArray(m.product_variants) ? m.product_variants[0] : m.product_variants;
          const p = Array.isArray(v?.products) ? v.products[0] : v?.products;
          return (
            <tr key={m.id}>
              <td className="px-4 py-2 text-neutral-500">{formatDate(m.created_at)}</td>
              <td className="px-4 py-2">{p?.name} <span className="text-neutral-500">{v?.name}</span></td>
              <td className={cn("px-4 py-2 font-medium", m.change < 0 ? "text-red-700" : "text-green-700")}>{m.change > 0 ? `+${m.change}` : m.change}</td>
              <td className="px-4 py-2">{m.quantity_after}</td>
              <td className="px-4 py-2">
                {m.order_id ? <Link href={`/admin/orders/${m.order_id}`} className="underline">{REASONS[m.reason] ?? m.reason}</Link> : REASONS[m.reason] ?? m.reason}
                {m.note && m.reason !== "order" && <span className="text-neutral-500"> · {m.note}</span>}
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
