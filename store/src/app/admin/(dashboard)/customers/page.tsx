import Link from "next/link";
import { PageHeader, Table } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/pricing";
import { currencyOf, getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const currency = currencyOf(await getSettings());
  const q = typeof sp.q === "string" ? sp.q.replace(/[,()%*]/g, "").trim() : "";

  let query = supabase.from("customers").select("id, full_name, phone, email, last_governorate, last_city, created_at").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  const { data: customers } = await query;

  const ids = (customers ?? []).map((c) => c.id);
  const { data: stats } = ids.length ? await supabase.from("customer_stats").select("*").in("customer_id", ids) : { data: [] as any[] };
  const byId = new Map((stats ?? []).map((s: any) => [s.customer_id, s]));

  return (
    <>
      <PageHeader title="Customers" />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, phone, email" className="input !min-h-[36px] max-w-xs !py-1" />
        <button className="btn btn-outline btn-sm">Search</button>
      </form>
      <Table head={["Customer", "Phone", "Location", "Orders", "Total spent", "Last order"]} empty="No customers yet. They appear automatically when someone places an order.">
        {(customers ?? []).map((c) => {
          const s: any = byId.get(c.id);
          return (
            <tr key={c.id} className="hover:bg-neutral-50">
              <td className="px-4 py-3"><Link href={`/admin/customers/${c.id}`} className="font-medium underline">{c.full_name}</Link>{c.email && <p className="text-xs text-neutral-500">{c.email}</p>}</td>
              <td className="px-4 py-3">{c.phone}</td>
              <td className="px-4 py-3">{[c.last_city, c.last_governorate].filter(Boolean).join(", ")}</td>
              <td className="px-4 py-3">{s?.total_orders ?? 0}</td>
              <td className="px-4 py-3">{formatMoney(Number(s?.total_spent ?? 0), currency)}</td>
              <td className="px-4 py-3 text-neutral-500">{s?.last_order_at ? formatDate(s.last_order_at) : "—"}</td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
