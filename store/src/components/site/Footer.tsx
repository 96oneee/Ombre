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
  return (
    <footer className="mt-24 bg-lagoon text-sand">
      <div className="container-x grid gap-10 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-4xl">{s.brand_name}</p>
          {s.footer_text && <p className="mt-4 max-w-sm text-sand/85">{s.footer_text}</p>}
        </div>
        <div>
          <h3 className="mb-3 font-body text-base font-medium">Explore</h3>
          <ul className="space-y-1.5">
            {[
              ["/", "Home"],
              ["/about", "About"],
              ["/product", "Product"],
              ["/shop", "Shop"],
              ["/cart", "Cart"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-body text-base font-medium">Contact</h3>
          <ul className="space-y-1.5">
            {s.instagram_url && (
              <li>
                <a href={s.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Instagram
                </a>
              </li>
            )}
            {wa && (
              <li>
                <a href={wa} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  WhatsApp
                </a>
              </li>
            )}
            {s.contact_email && (
              <li>
                <a href={`mailto:${s.contact_email}`} className="hover:underline">
                  {s.contact_email}
                </a>
              </li>
            )}
            {s.contact_phone && <li>{s.contact_phone}</li>}
            {s.address && <li className="text-sand/85">{s.address}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-sand/20">
        <p className="container-x py-5 text-sm text-sand/80">
          © {new Date().getFullYear()} {s.copyright_text || s.brand_name}
        </p>
      </div>
    </footer>
  );
}
