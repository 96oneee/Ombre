import Link from "next/link";
import { Card, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/pricing";
import { currencyOf, getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const { supabase } = await requireAdmin();
  const settings = await getSettings();
  const currency = currencyOf(settings);

  const [{ data: stats }, { data: recent }, { data: low }, { data: statuses }] = await Promise.all([
    supabase.rpc("admin_dashboard_stats"),
    supabase.from("orders").select("id, order_number, customer_name, total, status, created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("inventory").select("quantity, low_stock_threshold, product_variants!inner(id, name, is_active, products(name))").eq("product_variants.is_active", true).order("quantity").limit(30),
    supabase.from("order_statuses").select("key, label, color"),
  ]);

  const statusMap = new Map<string, any>((statuses ?? []).map((s: any) => [s.key, s]));
  const lowRows = (low ?? []).filter((r) => r.quantity <= r.low_stock_threshold).slice(0, 6);

  const tiles = [
    { label: "Total orders", value: String(stats?.total_orders ?? 0) },
    { label: "Sales (excluding cancelled)", value: formatMoney(Number(stats?.sales ?? 0), currency) },
    { label: "Pending orders", value: String(stats?.pending_orders ?? 0) },
    { label: "Products", value: String(stats?.products ?? 0) },
    { label: "Low stock items", value: String(stats?.low_stock ?? 0) },
  ];

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500">{t.label}</p>
            <p className="mt-2 text-2xl font-medium">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm underline">View all</Link>
          </div>
          <Table head={["Order", "Customer", "Total", "Status", "Placed"]} empty="No orders yet.">
            {(recent ?? []).map((o) => {
              const st = statusMap.get(o.status);
              return (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium underline">{o.order_number}</Link></td>
                  <td className="px-4 py-3">{o.customer_name}</td>
                  <td className="px-4 py-3">{formatMoney(Number(o.total), currency)}</td>
                  <td className="px-4 py-3"><StatusBadge label={st?.label ?? o.status} color={st?.color ?? "#6b7280"} /></td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(o.created_at)}</td>
                </tr>
              );
            })}
          </Table>
        </div>
        <Card title="Low stock">
          {lowRows.length === 0 ? (
            <p className="text-sm text-neutral-500">Nothing is running low.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {lowRows.map((r, i) => {
                const v: any = Array.isArray(r.product_variants) ? r.product_variants[0] : r.product_variants;
                const p: any = Array.isArray(v?.products) ? v.products[0] : v?.products;
                return (
                  <li key={i} className="flex justify-between py-2 text-sm">
                    <span>{p?.name} <span className="text-neutral-500">{v?.name}</span></span>
                    <span className={r.quantity === 0 ? "font-medium text-red-700" : "font-medium text-amber-700"}>{r.quantity === 0 ? "Out of stock" : `${r.quantity} left`}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/admin/inventory" className="mt-4 inline-block text-sm underline">Open inventory</Link>
        </Card>
      </div>
    </>
  );
}
