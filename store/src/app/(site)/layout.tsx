import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { getSettings } from "@/lib/settings";
import { BUCKETS, publicUrl } from "@/lib/storage";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <CartProvider>
      {s.announcement_enabled && s.announcement_text && (
        <div className="bg-lagoon px-4 py-2 text-center text-sm text-sand">{s.announcement_text}</div>
      )}
      <Header brand={s.brand_name} logoUrl={publicUrl(BUCKETS.site, s.logo_path)} />
      <main>{children}</main>
      <Footer s={s} />
    </CartProvider>
  );
}
