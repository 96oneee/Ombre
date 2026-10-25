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
        <div className="bg-sea px-4 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-shell md:text-[11px] md:tracking-[0.2em]">{s.announcement_text}</div>
      )}
      <Header brand={s.brand_name} logoUrl={publicUrl(BUCKETS.site, s.logo_path)} instagram={s.instagram_url} />
      <main>{children}</main>
      <Footer s={s} />
    </CartProvider>
  );
}
