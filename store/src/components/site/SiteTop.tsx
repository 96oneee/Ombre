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
  const home = usePathname() === "/";
  const [intro, setIntro] = useState(home);

  useEffect(() => {
    if (!home) return setIntro(false);
    setIntro(Boolean(document.querySelector("[data-intro]")) && window.__ombreIntro !== false);
    const on = (e: Event) => setIntro((e as CustomEvent<boolean>).detail);
    window.addEventListener("ombre:intro", on);
    return () => window.removeEventListener("ombre:intro", on);
  }, [home]);

  if (!home) return <>{children}</>;
  return (
    <div
      className={cn("fixed inset-x-0 top-0 z-40 transition-[transform,opacity] duration-700 ease-shade", intro && "pointer-events-none -translate-y-full opacity-0")}
      aria-hidden={intro || undefined}
    >
      {children}
    </div>
  );
}
