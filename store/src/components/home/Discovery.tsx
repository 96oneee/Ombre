"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import type { HomeContent } from "@/lib/home";
import { cn } from "@/lib/utils";
import { Em, plain } from "./Em";

/**
 * Chapter 2 · Product discovery.
 * Desktop: the picture stays in place while the facts scroll past, each one bringing its close-up.
 * Phone: each fact is its own picture and line.
 */
export function Discovery({ c }: { c: HomeContent["discovery"] }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>("[data-fact]").forEach((fact, i) => {
        ScrollTrigger.create({
          trigger: fact,
          start: "top 60%",
          end: "bottom 60%",
          onToggle: (self) => self.isActive && setActive(i),
        });
      });
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.querySelectorAll<HTMLElement>("[data-rise]").forEach((n) => {
          gsap.from(n, { y: 32, autoAlpha: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: n, start: "top 85%" } });
        });
      }
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section id="discover" ref={root} className="scroll-mt-24 py-24 md:py-40" aria-labelledby="discover-title">
      <div className="container-x">
        <p className="eyebrow" data-rise>
          {c.eyebrow}
        </p>
        <h2 id="discover-title" data-rise className="mt-4 max-w-[14ch] font-display text-[44px] font-light leading-none md:text-[88px]">
          <Em text={c.title} />
        </h2>

        <div className="mt-16 grid gap-10 md:mt-24 md:grid-cols-12 md:gap-10">
          {/* sticky picture, desktop only */}
          <div className="hidden md:col-span-7 md:block">
            <div className="sticky top-28 aspect-[4/5] max-h-[78vh] w-full overflow-hidden bg-dune">
              {c.facts.map((f, i) => (
                <Image
                  key={f.image + i}
                  src={f.image}
                  alt={i === active ? plain(f.alt) : ""}
                  aria-hidden={i !== active}
                  fill
                  sizes="58vw"
                  className={cn(
                    "object-cover transition-[opacity,transform] duration-[1200ms] ease-shade",
                    i === active ? "scale-100 opacity-100" : "scale-[1.06] opacity-0",
                  )}
                />
              ))}
              <p className="absolute bottom-5 left-5 bg-shell/90 px-3 py-2 font-body text-[12px] tracking-[0.14em] text-charcoal">
                {String(active + 1).padStart(2, "0")} / {String(c.facts.length).padStart(2, "0")}
              </p>
            </div>
          </div>

          <ol className="md:col-span-5 md:pt-[10vh]">
            {c.facts.map((f, i) => (
              <li key={f.title + i} data-fact className="border-t border-charcoal/15 py-10 md:flex md:min-h-[62vh] md:flex-col md:justify-center md:py-0">
                <div className="relative mb-8 aspect-[4/5] overflow-hidden bg-dune md:hidden">
                  <Image src={f.image} alt={plain(f.alt)} fill sizes="100vw" className="object-cover" />
                </div>
                <p className={cn("font-display text-[22px] italic transition-colors duration-500", i === active ? "text-wood" : "text-mist")}>
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 font-display text-[34px] font-light leading-tight md:text-[48px]">{f.title}</h3>
                <p className="mt-4 max-w-[36ch] text-[16px] leading-relaxed text-mist">{f.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
