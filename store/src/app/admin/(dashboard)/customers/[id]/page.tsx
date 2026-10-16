import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Flash, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { waLink } from "@/components/site/Footer";
import { requireAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/pricing";
import { currencyOf, getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { saveCustomerNotes } from "../actions";

export const metadata = { title: "Customer" };

export default async function CustomerDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const settings = await getSettings();
  const currency = currencyOf(settings);

  const [{ data: c }, { data: stats }, { data: orders }, { data: statuses }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("customer_stats").select("*").eq("customer_id", id).maybeSingle(),
    supabase.from("orders").select("id, order_number, total, status, created_at").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("order_statuses").select("key, label, color"),
  ]);
  if (!c) notFound();
  const map = new Map<string, any>((statuses ?? []).map((s: any) => [s.key, s]));
  const wa = waLink(c.phone, `Hello ${c.full_name}, this is ${settings.brand_name}.`);

  return (
    <>
      <PageHeader title={c.full_name}>
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">WhatsApp</a>}
        <Link href="/admin/customers" className="btn btn-outline btn-sm">All customers</Link>
      </PageHeader>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <Card title="Details">
            <p><a href={`tel:${c.phone}`} className="underline">{c.phone}</a></p>
            {c.email && <p><a href={`mailto:${c.email}`} className="underline">{c.email}</a></p>}
            <p className="mt-3 text-sm text-neutral-600">{[c.last_address, c.last_city, c.last_governorate].filter(Boolean).join(", ")}</p>
            <p className="mt-3 text-sm text-neutral-500">Customer since {formatDate(c.created_at)}</p>
            <p className="mt-3 text-sm">{stats?.total_orders ?? 0} orders · {formatMoney(Number(stats?.total_spent ?? 0), currency)} spent</p>
          </Card>
          <Card title="Notes">
            <form action={saveCustomerNotes.bind(null, id)} className="space-y-3">
              <textarea name="notes" defaultValue={c.notes ?? ""} rows={4} className="input" aria-label="Notes" />
              <button className="btn btn-outline btn-sm">Save notes</button>
            </form>
          </Card>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-medium">Orders</h2>
          <Table head={["Order", "Total", "Status", "Placed"]} empty="No orders.">
            {(orders ?? []).map((o) => {
              const st = map.get(o.status);
              return (
                <tr key={o.id}>
                  <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium underline">{o.order_number}</Link></td>
                  <td className="px-4 py-3">{formatMoney(Number(o.total), currency)}</td>
                  <td className="px-4 py-3"><StatusBadge label={st?.label ?? o.status} color={st?.color ?? "#6b7280"} /></td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(o.created_at)}</td>
                </tr>
              );
            })}
          </Table>
        </div>
      </div>
    </>
  );
}
