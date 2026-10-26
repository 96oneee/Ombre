import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/site/ProductView";
import { getProductBySlug } from "@/lib/catalog";
import { formatMoney } from "@/lib/pricing";
import { currencyOf, getDelivery, getPaymentMethods, getSettings } from "@/lib/settings";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  return { title: p.seo_title || p.name, description: p.seo_description || p.short_description || undefined };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { colour } = await searchParams;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const settings = await getSettings();
  const currency = currencyOf(settings);
  const { settings: delivery } = await getDelivery();
  const methods = await getPaymentMethods();

  const paragraphs = (product.description ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <div>
      <ProductView product={product} currency={currency} initialVariant={typeof colour === "string" ? colour : undefined}>
        <dl className="mt-10 divide-y divide-charcoal/10 border-y border-charcoal/10 text-[15px]">
          <div className="flex justify-between gap-6 py-4">
            <dt className="text-mist">Delivery</dt>
            <dd className="text-right">
              {delivery.is_enabled ? (
                <>
                  {formatMoney(delivery.flat_fee, currency)}
                  {delivery.free_delivery_threshold != null && `, free over ${formatMoney(delivery.free_delivery_threshold, currency)}`}
                  {delivery.notes && <span className="block text-mist">{delivery.notes}</span>}
                </>
              ) : (
                "Currently unavailable"
              )}
            </dd>
          </div>
          {(methods ?? []).map((m) => (
            <div key={m.key} className="flex justify-between gap-6 py-4">
              <dt className="text-mist">Payment</dt>
              <dd className="text-right">
                {m.label}
                {m.description && <span className="block text-mist">{m.description}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </ProductView>

      {(paragraphs.length > 0 || product.specs.length > 0) && (
        <section className="border-t border-charcoal/10 bg-shell py-16 md:py-24">
          <div className="container-x grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="eyebrow">Details</p>
              {paragraphs.length > 0 && (
                <div className="paragraphs mt-6 text-[17px] leading-relaxed text-mist">
                  {paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}
            </div>
            {product.specs.length > 0 && (
              <dl className="divide-y divide-charcoal/10 border-y border-charcoal/10 md:col-span-6 md:col-start-7">
                {product.specs.map((row, i) => (
                  <div key={i} className="flex justify-between gap-6 py-5">
                    <dt className="text-mist">{row.label}</dt>
                    <dd className="text-right font-display text-[22px] leading-tight">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>
      )}

      <section className="container-x flex flex-col items-start justify-between gap-6 py-14 sm:flex-row sm:items-center">
        <p className="font-display text-[32px] font-light leading-tight md:text-[44px]">
          Sun? <em>Blocked.</em>
        </p>
        <div className="flex gap-3">
          <Link href="/cart" className="btn btn-outline">
            View cart
          </Link>
          <Link href="/shop" className="btn btn-outline">
            Continue shopping
          </Link>
        </div>
      </section>
    </div>
  );
}
