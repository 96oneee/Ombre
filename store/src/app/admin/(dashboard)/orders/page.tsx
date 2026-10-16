import Link from "next/link";
import { Flash, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/pricing";
import { currencyOf, getSettings } from "@/lib/settings";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Orders" };
const PAGE = 30;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const currency = currencyOf(await getSettings());
  const status = typeof sp.status === "string" ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q.replace(/[,()%*]/g, "").trim() : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);

  const { data: statuses } = await supabase.from("order_statuses").select("*").order("sort_order");
  const map = new Map<string, any>((statuses ?? []).map((s: any) => [s.key, s]));

  let query = supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_phone, total, status, payment_status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`);
  const { data: orders, count } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));

  const href = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(status && { status }), ...(q && { q }), ...extra });
    return `/admin/orders?${p.toString()}`;
  };

  return (
    <>
      <PageHeader title="Orders" />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Link href={href({ status: "" })} className={cn("rounded-full border px-3 py-1", !status ? "border-lagoon bg-lagoon text-white" : "border-neutral-300")}>All</Link>
        {(statuses ?? []).map((s) => (
          <Link key={s.key} href={href({ status: s.key })} className={cn("rounded-full border px-3 py-1", status === s.key ? "border-lagoon bg-lagoon text-white" : "border-neutral-300")}>{s.label}</Link>
        ))}
        <form className="ml-auto flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search number, name, phone" className="input !min-h-[36px] w-64 !py-1" />
          <button className="btn btn-outline btn-sm">Search</button>
        </form>
      </div>

      <Table head={["Order", "Customer", "Total", "Status", "Payment", "Placed"]} empty="No orders found.">
        {(orders ?? []).map((o) => {
          const st = map.get(o.status);
          return (
            <tr key={o.id} className="hover:bg-neutral-50">
              <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium underline">{o.order_number}</Link></td>
              <td className="px-4 py-3">{o.customer_name}<p className="text-xs text-neutral-500">{o.customer_phone}</p></td>
              <td className="px-4 py-3">{formatMoney(Number(o.total), currency)}</td>
              <td className="px-4 py-3"><StatusBadge label={st?.label ?? o.status} color={st?.color ?? "#6b7280"} /></td>
              <td className="px-4 py-3 capitalize">{o.payment_status}</td>
              <td className="px-4 py-3 text-neutral-500">{formatDate(o.created_at)}</td>
            </tr>
          );
        })}
      </Table>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link className="underline" href={href({ page: String(page - 1) })}>← Newer</Link> : <span />}
          <span className="text-neutral-500">Page {page} of {pages}</span>
          {page < pages ? <Link className="underline" href={href({ page: String(page + 1) })}>Older →</Link> : <span />}
        </div>
      )}
    </>
  );
}
