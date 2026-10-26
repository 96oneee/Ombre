"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    __ombreIntro?: boolean;
  }
}

/**
 * The announcement bar and header. On the homepage they float over the page and stay out of the way
 * while the opening plays, sliding in once the visitor has scrolled into the site.
 */
export function SiteTop({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // the homepage is the page with the opening on it (also when served from another path, like a preview)
  const [withIntro, setWithIntro] = useState(pathname === "/");
  const home = pathname === "/" || withIntro;
  const [intro, setIntro] = useState(home);

  useEffect(() => {
    const found = Boolean(document.querySelector("[data-intro]"));
    setWithIntro(found);
    setIntro(found && window.__ombreIntro !== false);
    if (!found) return;
    const on = (e: Event) => setIntro((e as CustomEvent<boolean>).detail);
    window.addEventListener("ombre:intro", on);
    return () => window.removeEventListener("ombre:intro", on);
  }, [pathname]);

  // always the same element, so a page that renders differently on the client never changes the tree's shape
  return (
    <div
      className={cn(home ? "fixed inset-x-0 top-0 z-40 transition-[transform,opacity] duration-700 ease-shade" : "contents", intro && "pointer-events-none -translate-y-full opacity-0")}
      aria-hidden={intro || undefined}
    >
      {children}
    </div>
  );
}
