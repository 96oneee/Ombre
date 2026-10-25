"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/#discover", label: "The Ombre" },
  { href: "/#how", label: "How it works" },
];

function Wordmark({ brand, logoUrl, className }: { brand: string; logoUrl: string | null; className?: string }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={brand} className={cn("h-9 w-auto", className)} />;
  }
  return (
    <span
      role="img"
      aria-label={brand}
      className={cn("block h-[34px] w-[108px] bg-current md:h-[40px] md:w-[128px]", className)}
      style={{ mask: "url(/img/wordmark.svg) no-repeat center / contain", WebkitMask: "url(/img/wordmark.svg) no-repeat center / contain" }}
    />
  );
}

export function Header({ brand, logoUrl, instagram }: { brand: string; logoUrl: string | null; instagram?: string }) {
  const pathname = usePathname();
  const { count, lastAdded } = useCart();
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!lastAdded) return;
    setBump(true);
    const t = window.setTimeout(() => setBump(false), 600);
    return () => window.clearTimeout(t);
  }, [lastAdded]);

  const label = "text-[12px] font-medium uppercase tracking-[0.18em]";

  return (
    <header className="sticky top-0 z-40 border-b border-charcoal/10 bg-sand/85 backdrop-blur-md">
      <div className="container-x grid h-[68px] grid-cols-[1fr_auto_1fr] items-center gap-4 md:h-[76px]">
        <nav aria-label="Main" className={cn("hidden items-center gap-8 md:flex", label)}>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="relative py-1 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100">
              {l.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="flex h-11 w-11 flex-col justify-center gap-[6px] md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={cn("block h-px w-6 bg-charcoal transition-transform", open && "translate-y-[3.5px] rotate-45")} />
          <span className={cn("block h-px w-6 bg-charcoal transition-transform", open && "-translate-y-[3.5px] -rotate-45")} />
        </button>

        <Link href="/" className="text-sea" aria-label={`${brand}, home`}>
          <Wordmark brand={brand} logoUrl={logoUrl} />
        </Link>

        <div className={cn("flex items-center justify-end gap-6", label)}>
          {instagram && (
            <a href={instagram} target="_blank" rel="noopener noreferrer" className="hidden md:inline">
              Instagram
            </a>
          )}
          <Link href="/cart" className="inline-flex min-h-[44px] items-center gap-2" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
            Cart
            <span
              className={cn(
                "inline-grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[11px] tracking-normal transition-transform duration-300",
                count > 0 ? "bg-sea text-shell" : "border border-charcoal/25",
                bump && "scale-125",
              )}
            >
              {count}
            </span>
          </Link>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="h-[calc(100svh-68px)] border-t border-charcoal/10 bg-sand md:hidden">
          <ul className="container-x pt-4">
            {[...LINKS, { href: "/cart", label: "Cart" }].map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block border-b border-charcoal/10 py-5 font-display text-[40px] font-light">
                  {l.label}
                </Link>
              </li>
            ))}
            {instagram && (
              <li>
                <a href={instagram} target="_blank" rel="noopener noreferrer" className={cn("mt-8 inline-block", label)}>
                  Instagram
                </a>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
