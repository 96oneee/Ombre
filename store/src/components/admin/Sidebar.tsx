"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/discounts", label: "Discounts" },
  { href: "/admin/website", label: "Website" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/settings", label: "Settings" },
];

export function Sidebar({ email, brand }: { email: string; brand: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const nav = (
    <nav aria-label="Admin" className="flex-1 space-y-1 px-3">
      {NAV.map((n) => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn("block rounded-md px-3 py-2.5 text-[15px]", active ? "bg-lagoon text-white" : "text-neutral-700 hover:bg-neutral-100")}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-neutral-200 p-4 text-sm">
      <p className="truncate text-neutral-500">{email}</p>
      <div className="mt-2 flex gap-3">
        <Link href="/" target="_blank" className="underline">View site</Link>
        <button type="button" onClick={signOut} className="underline">Sign out</button>
      </div>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:hidden">
        <span className="font-display text-2xl">{brand} admin</span>
        <button type="button" className="btn btn-outline btn-sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-20 flex flex-col overflow-auto bg-white pt-3 lg:hidden">
          {nav}
          {footer}
        </div>
      )}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-neutral-200 bg-white pt-6 lg:flex">
        <p className="px-6 pb-5 font-display text-3xl">{brand}</p>
        {nav}
        {footer}
      </aside>
    </>
  );
}
