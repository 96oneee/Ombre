import Link from "next/link";
import type { SiteSettings } from "@/lib/settings";
import { digitsOnly } from "@/lib/utils";

export function waLink(number: string, text?: string): string | null {
  const d = digitsOnly(number);
  if (!d) return null;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function Footer({ s }: { s: SiteSettings }) {
  const wa = waLink(s.whatsapp_number);
  const h = "mb-5 font-body text-[11px] font-semibold uppercase tracking-label text-shell/60";
  return (
    <footer className="overflow-hidden bg-charcoal text-shell">
      <div className="container-x grid gap-12 pb-10 pt-20 md:grid-cols-12 md:pt-28">
        <div className="md:col-span-5">
          <p className="font-display text-[36px] font-light italic leading-tight md:text-[44px]">The Art of Shade</p>
          {s.footer_text && <p className="mt-5 max-w-[36ch] text-[15px] leading-relaxed text-shell/70">{s.footer_text}</p>}
        </div>
        <div className="md:col-span-2 md:col-start-7">
          <h2 className={h}>Shop</h2>
          <ul className="space-y-3 text-[15px]">
            <li><Link href="/shop" className="hover:text-wood-light">All products</Link></li>
            <li><Link href="/#shade" className="hover:text-wood-light">Choose your shade</Link></li>
            <li><Link href="/cart" className="hover:text-wood-light">Cart</Link></li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <h2 className={h}>OMBRE</h2>
          <ul className="space-y-3 text-[15px]">
            <li><Link href="/#discover" className="hover:text-wood-light">The Ombre</Link></li>
            <li><Link href="/#how" className="hover:text-wood-light">How it works</Link></li>
            <li><Link href="/about" className="hover:text-wood-light">About</Link></li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <h2 className={h}>Contact</h2>
          <ul className="space-y-3 text-[15px]">
            {wa && <li><a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-wood-light">WhatsApp</a></li>}
            {s.instagram_url && <li><a href={s.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-wood-light">Instagram</a></li>}
            {s.contact_email && <li><a href={`mailto:${s.contact_email}`} className="hover:text-wood-light">{s.contact_email}</a></li>}
            {s.contact_phone && <li className="text-shell/70">{s.contact_phone}</li>}
            {s.address && <li className="text-shell/70">{s.address}</li>}
          </ul>
        </div>
      </div>
      <div className="container-x">
        <div
          aria-hidden
          className="mt-8 aspect-[830/262] w-full translate-y-[14%] bg-shell/95"
          style={{ mask: "url(/img/wordmark.svg) no-repeat center bottom / contain", WebkitMask: "url(/img/wordmark.svg) no-repeat center bottom / contain" }}
        />
      </div>
      <div className="relative border-t border-shell/15 bg-charcoal">
        <p className="container-x py-5 text-[12px] tracking-[0.06em] text-shell/60">
          © {new Date().getFullYear()} {s.copyright_text || s.brand_name}
        </p>
      </div>
    </footer>
  );
}
