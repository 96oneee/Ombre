"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/product", label: "Product" },
  { href: "/shop", label: "Shop" },
];

export function Header({ brand, logoUrl }: { brand: string; logoUrl: string | null }) {
  const pathname = usePathname();
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-sand/95 backdrop-blur">
      <div className="container-x flex h-[72px] items-center justify-between gap-6">
        <Link href="/" className="flex items-center text-lagoon-deep" aria-label={`${brand} home`} onClick={() => setOpen(false)}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={brand} className="h-10 w-auto" />
          ) : (
            <span className="font-display text-3xl tracking-wide">{brand}</span>
          )}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-9 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn("border-b py-1 transition-colors", isActive(l.href) ? "border-ink" : "border-transparent hover:border-ink/50")}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-ink/20 px-4 hover:border-ink"
            aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
          >
            Cart
            <span
              className={cn(
                "inline-grid min-w-[1.5rem] place-items-center rounded-full px-1.5 text-xs font-medium leading-6",
                count > 0 ? "bg-lagoon text-sand" : "border border-ink/20 text-ink-soft",
              )}
            >
              {count}
            </span>
          </Link>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-ink/20 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative block h-3 w-5">
              <span className={cn("absolute left-0 h-px w-5 bg-ink transition-all", open ? "top-1.5 rotate-45" : "top-0")} />
              <span className={cn("absolute left-0 top-1.5 h-px w-5 bg-ink transition-opacity", open && "opacity-0")} />
              <span className={cn("absolute left-0 h-px w-5 bg-ink transition-all", open ? "top-1.5 -rotate-45" : "top-3")} />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-ink/10 bg-sand md:hidden">
          <ul className="container-x py-3">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={cn("block border-b border-ink/10 py-4 font-display text-3xl", isActive(l.href) && "text-lagoon-deep")}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
