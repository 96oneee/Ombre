import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Carousel } from "@/components/site/Carousel";
import { Price, ProductBuy, StockNote } from "@/components/site/ProductBuy";
import { getProductBySlug } from "@/lib/catalog";
import { formatMoney } from "@/lib/pricing";
import { currencyOf, getDelivery, getPaymentMethods, getSettings } from "@/lib/settings";
import { BUCKETS, publicUrl } from "@/lib/storage";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  return { title: p.seo_title || p.name, description: p.seo_description || p.short_description || undefined };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const settings = await getSettings();
  const currency = currencyOf(settings);
  const { settings: delivery } = await getDelivery();
  const methods = await getPaymentMethods();

  const paragraphs = (product.description ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <div>
      <header className="container-x pb-10 pt-14 md:pt-20">
        <h1 className="text-6xl md:text-8xl">{product.name}</h1>
        {product.short_description && <p className="mt-5 max-w-2xl text-xl text-ink-soft">{product.short_description}</p>}
        {product.variants.length > 1 && (
          <nav aria-label="Colors" className="mt-8 flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <a key={v.id} href={`#color-${v.id}`} className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-sm hover:border-ink">
                <span className="h-4 w-4 rounded-full border border-ink/20" style={{ background: v.hex_color ?? "#ddd" }} />
                {v.name}
              </a>
            ))}
          </nav>
        )}
      </header>

      {product.variants.length === 0 && (
        <p className="container-x py-20 text-ink-soft">No colors are available right now.</p>
      )}

      {product.variants.map((v, i) => (
        <section key={v.id} id={`color-${v.id}`} className={`scroll-mt-24 py-12 md:py-16 ${i % 2 === 1 ? "bg-linen" : ""}`} aria-labelledby={`h-${v.id}`}>
          <div className="container-x grid items-start gap-10 md:grid-cols-[1.15fr_0.85fr] md:gap-16">
            <Carousel
              label={`${product.name} in ${v.name}`}
              placeholderLabel={`${v.name} photos placeholder`}
              slides={v.images
                .map((img) => ({ url: publicUrl(BUCKETS.products, img.storage_path) ?? "", alt: img.alt_text || `${product.name} in ${v.name}` }))
                .filter((s) => s.url)}
            />
            <div className="md:sticky md:top-28">
              <p className="flex items-center gap-3 text-sm text-ink-soft">
                <span className="h-5 w-5 rounded-full border border-ink/20" style={{ background: v.hex_color ?? "#ddd" }} aria-hidden />
                Color
              </p>
              <h2 id={`h-${v.id}`} className="mt-2 text-5xl md:text-6xl">
                {product.name} <span className="text-ink-soft">{v.name}</span>
              </h2>
              <Price unit={v.unit_price} compareAt={v.compare_at} currency={currency} className="mt-5 font-display text-4xl" />
              <div className="mt-2">
                <StockNote v={v} />
              </div>
              <div className="mt-8">
                <ProductBuy variant={v} />
              </div>
              {v.sku && <p className="mt-6 text-xs text-ink-soft">SKU {v.sku}</p>}
            </div>
          </div>
        </section>
      ))}

      <section className="container-x grid gap-12 py-16 md:grid-cols-2 md:py-24">
        <div>
          <h2 className="text-4xl md:text-5xl">Details</h2>
          {paragraphs.length > 0 ? (
            <div className="paragraphs mt-6 text-lg leading-relaxed text-ink-soft">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-ink-soft">Product description placeholder.</p>
          )}
        </div>
        <div>
          {product.specs.length > 0 && (
            <>
              <h2 className="text-4xl md:text-5xl">Specifications</h2>
              <dl className="mt-6 divide-y divide-ink/15 border-y border-ink/15">
                {product.specs.map((row, i) => (
                  <div key={i} className="flex justify-between gap-6 py-3">
                    <dt className="text-ink-soft">{row.label}</dt>
                    <dd className="text-right">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          <h2 className="mt-12 text-4xl md:text-5xl">Delivery and payment</h2>
          <div className="mt-6 space-y-3 text-ink-soft">
            {delivery.is_enabled ? (
              <p>
                Delivery fee: {formatMoney(delivery.flat_fee, currency)}
                {delivery.free_delivery_threshold != null && `, free on orders over ${formatMoney(delivery.free_delivery_threshold, currency)}`}.
              </p>
            ) : (
              <p>Delivery is currently unavailable.</p>
            )}
            {delivery.notes && <p>{delivery.notes}</p>}
            {(methods ?? []).map((m) => (
              <p key={m.key}>
                <span className="font-normal text-ink">{m.label}.</span> {m.description}
              </p>
            ))}
          </div>
          <div className="mt-8 flex gap-3">
            <Link href="/cart" className="btn btn-outline">
              View cart
            </Link>
            <Link href="/shop" className="btn btn-outline">
              Continue shopping
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
