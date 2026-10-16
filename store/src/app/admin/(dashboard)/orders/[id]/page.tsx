import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Field, Flash, PageHeader, StatusBadge } from "@/components/admin/ui";
import { waLink } from "@/components/site/Footer";
import { requireAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/pricing";
import { currencyOf, getSettings } from "@/lib/settings";
import { BUCKETS, publicUrl } from "@/lib/storage";
import { formatDate } from "@/lib/utils";
import { updateOrderDetails, updateOrderStatus } from "../actions";

export const metadata = { title: "Order" };

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const settings = await getSettings();
  const currency = { ...currencyOf(settings) };

  const [{ data: order }, { data: statuses }, { data: method }] = await Promise.all([
    supabase.from("orders").select("*, order_items(*), order_status_history(*)").eq("id", id).maybeSingle(),
    supabase.from("order_statuses").select("*").order("sort_order"),
    supabase.from("payment_methods").select("key, label"),
  ]);
  if (!order) notFound();

  const money = (n: number) => formatMoney(Number(n), currency);
  const st = (statuses ?? []).find((s) => s.key === order.status);
  const items = [...(order.order_items ?? [])].sort((a: any, b: any) => a.position - b.position);
  const history = [...(order.order_status_history ?? [])].sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
  const pmLabel = (method ?? []).find((m) => m.key === order.payment_method)?.label ?? order.payment_method;
  const statusLabel = (k: string | null) => (statuses ?? []).find((s) => s.key === k)?.label ?? k;
  const wa = waLink(order.customer_phone, `Hello ${order.customer_name}, this is ${settings.brand_name} about your order ${order.order_number}.`);

  return (
    <>
      <PageHeader title={`Order ${order.order_number}`}>
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">Message customer on WhatsApp</a>}
        <Link href="/admin/orders" className="btn btn-outline btn-sm">All orders</Link>
      </PageHeader>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card title="Items">
            <ul className="divide-y divide-neutral-100">
              {items.map((i: any) => {
                const img = publicUrl(BUCKETS.products, i.image_path);
                return (
                  <li key={i.id} className="flex items-center gap-4 py-3">
                    {img ? <img src={img} alt="" className="h-16 w-12 rounded object-cover" /> : <div className="h-16 w-12 rounded bg-neutral-100" />}
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{i.product_name}</p>
                      <p className="text-neutral-500">{i.variant_name}{i.sku && ` · ${i.sku}`}</p>
                      <p className="text-neutral-500">{money(i.unit_price)} × {i.quantity}</p>
                    </div>
                    <p>{money(i.line_total)}</p>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-neutral-200 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-neutral-500">Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
              {Number(order.discount_amount) > 0 && <div className="flex justify-between"><dt className="text-neutral-500">Discount {order.discount_code && `(${order.discount_code})`}</dt><dd>−{money(order.discount_amount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-neutral-500">Delivery</dt><dd>{money(order.delivery_fee)}</dd></div>
              <div className="flex justify-between pt-2 text-base font-medium"><dt>Total</dt><dd>{money(order.total)}</dd></div>
            </dl>
          </Card>

          <Card title="History">
            <ol className="space-y-3 text-sm">
              {history.map((h: any) => (
                <li key={h.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lagoon" />
                  <div>
                    <p>{h.from_status ? <>{statusLabel(h.from_status)} → <strong>{statusLabel(h.to_status)}</strong></> : <strong>{statusLabel(h.to_status)}</strong>}</p>
                    {h.note && <p className="text-neutral-600">{h.note}</p>}
                    <p className="text-xs text-neutral-500">{formatDate(h.created_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <p className="mb-4"><StatusBadge label={st?.label ?? order.status} color={st?.color ?? "#6b7280"} /></p>
            <form action={updateOrderStatus.bind(null, id)} className="space-y-3">
              <Field label="Change status">
                <select name="status" defaultValue={order.status} className="input">
                  {(statuses ?? []).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Note (optional)"><input name="note" className="input" /></Field>
              <button className="btn btn-primary btn-sm">Update status</button>
              <p className="text-xs text-neutral-500">Cancelling an order puts its items back in stock automatically.</p>
            </form>
          </Card>

          <Card title="Customer">
            <p className="font-medium">{order.customer_name}</p>
            <p className="text-sm"><a href={`tel:${order.customer_phone}`} className="underline">{order.customer_phone}</a></p>
            {order.customer_email && <p className="text-sm"><a href={`mailto:${order.customer_email}`} className="underline">{order.customer_email}</a></p>}
            <p className="mt-3 text-sm text-neutral-600">{order.address}<br />{order.city}, {order.governorate}</p>
            {order.notes && <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">Customer note: {order.notes}</p>}
            {order.customer_id && <Link href={`/admin/customers/${order.customer_id}`} className="mt-3 inline-block text-sm underline">View customer</Link>}
          </Card>

          <Card title="Payment and notes">
            <p className="mb-3 text-sm text-neutral-600">Method: {pmLabel}</p>
            <form action={updateOrderDetails.bind(null, id)} className="space-y-3">
              <Field label="Payment status">
                <select name="payment_status" defaultValue={order.payment_status} className="input">
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                </select>
              </Field>
              <Field label="Internal notes (not shown to the customer)"><textarea name="admin_notes" defaultValue={order.admin_notes ?? ""} rows={3} className="input" /></Field>
              <button className="btn btn-outline btn-sm">Save</button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
