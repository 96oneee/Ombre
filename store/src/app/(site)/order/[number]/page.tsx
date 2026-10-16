import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { waLink } from "@/components/site/Footer";
import { formatMoney } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { BUCKETS, publicUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ number: string }> };

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false, follow: false } };

interface OrderItem {
  product_name: string;
  variant_name: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  image_path: string | null;
}

export default async function OrderPage({ params }: Props) {
  const { number } = await params;
  const supabase = await createClient();
  const { data: order } = await supabase.rpc("get_order_public", { p_number: number });
  if (!order) notFound();

  const settings = await getSettings();
  const currency = { code: order.currency, symbol: settings.currency_symbol, position: settings.currency_position };
  const money = (n: number) => formatMoney(Number(n), currency);
  const wa = waLink(settings.whatsapp_number, `Hello, I placed order ${order.order_number}.`);
  const items: OrderItem[] = order.items ?? [];

  return (
    <div className="container-x py-14 md:py-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-6xl md:text-7xl">Order received</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Thank you, {String(order.customer_name).split(" ")[0]}. We&apos;ll contact you to confirm your delivery.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-md bg-linen p-5">
          <div>
            <p className="text-xs text-ink-soft">Order number</p>
            <p className="font-display text-3xl tracking-wide">{order.order_number}</p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Status</p>
            <p className="text-lg">{order.status_label}</p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Placed</p>
            <p className="text-lg">{formatDate(order.created_at)}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-ink-soft">Keep this order number. You&apos;ll need it if you contact us.</p>

        <h2 className="mt-12 text-3xl">Items</h2>
        <ul className="mt-4 divide-y divide-ink/15 border-y border-ink/15">
          {items.map((i, idx) => {
            const img = publicUrl(BUCKETS.products, i.image_path);
            return (
              <li key={idx} className="flex items-center gap-4 py-4">
                {img && <img src={img} alt="" className="h-20 w-16 rounded object-cover" />}
                <div className="flex-1">
                  <p className="font-display text-xl">{i.product_name}</p>
                  <p className="text-sm text-ink-soft">{i.variant_name} × {i.quantity} at {money(i.unit_price)}</p>
                </div>
                <p>{money(i.line_total)}</p>
              </li>
            );
          })}
        </ul>

        <dl className="mt-6 space-y-2">
          <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
          {Number(order.discount_amount) > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount</dt><dd>−{money(order.discount_amount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-ink-soft">Delivery</dt><dd>{Number(order.delivery_fee) === 0 ? "Free" : money(order.delivery_fee)}</dd></div>
          <div className="flex justify-between border-t border-ink/15 pt-3 text-xl"><dt>Total</dt><dd>{money(order.total)}</dd></div>
        </dl>

        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="text-2xl">Delivery</h2>
            <p className="mt-2 text-ink-soft">{order.address}<br />{order.city}, {order.governorate}</p>
          </div>
          <div>
            <h2 className="text-2xl">Payment</h2>
            <p className="mt-2 text-ink-soft">{order.payment_method}</p>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Contact us on WhatsApp
            </a>
          )}
          <Link href="/shop" className="btn btn-outline">Continue shopping</Link>
        </div>
      </div>
    </div>
  );
}
