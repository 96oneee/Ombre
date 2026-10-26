import Link from "next/link";
import { ShopCard } from "@/components/site/ShopCard";
import { getActiveProducts } from "@/lib/catalog";
import { currencyOf, getSettings } from "@/lib/settings";
import { BUCKETS, publicUrl } from "@/lib/storage";

export const metadata = { title: "Shop" };

export default async function ShopPage() {
  const [products, settings] = await Promise.all([getActiveProducts(), getSettings()]);
  const currency = currencyOf(settings);
  const single = products.length === 1 ? products[0] : null;
  const scene = single?.shared_images[0];
  const sceneUrl = scene ? publicUrl(BUCKETS.products, scene.storage_path) : null;
  return (
    <div className="container-x py-14 md:py-20">
      <p className="eyebrow">OMBRE</p>
      <h1 className="mt-4 font-display text-[56px] font-light leading-none tracking-tight md:text-[96px]">Shop</h1>
      {products.length === 0 ? (
        <p className="mt-10 text-mist">No products yet. Add one in Admin &gt; Products and set it to Active.</p>
      ) : single ? (
        // one product: give it the whole page, with the photo of it in use beside it
        <div className="mt-12 grid items-start gap-10 md:grid-cols-2 md:gap-16">
          <ShopCard product={single} currency={currency} />
          {sceneUrl && (
            <Link href={`/product/${single.slug}`} className="relative hidden aspect-[4/5] overflow-hidden bg-dune md:block" aria-label={`View ${single.name}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sceneUrl} alt={scene?.alt_text ?? ""} className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]" loading="lazy" />
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-12 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ShopCard key={p.id} product={p} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}
