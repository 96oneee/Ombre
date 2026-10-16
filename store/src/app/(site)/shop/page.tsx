import { ShopCard } from "@/components/site/ShopCard";
import { getActiveProducts } from "@/lib/catalog";
import { currencyOf, getSettings } from "@/lib/settings";

export const metadata = { title: "Shop" };

export default async function ShopPage() {
  const [products, settings] = await Promise.all([getActiveProducts(), getSettings()]);
  const currency = currencyOf(settings);
  return (
    <div className="container-x py-14 md:py-20">
      <h1 className="text-6xl md:text-8xl">Shop</h1>
      {products.length === 0 ? (
        <p className="mt-10 text-ink-soft">No products yet. Add one in Admin &gt; Products and set it to Active.</p>
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
