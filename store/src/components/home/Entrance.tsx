"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap, type ScrollTrigger } from "@/lib/gsap";
import type { HomeContent } from "@/lib/home";
import { Em, plain } from "./Em";
import { OmbreFigure, type OmbreHandle } from "./OmbreFigure";

/**
 * Chapter 1 · Cinematic arrival.
 * A folded Ombre waits on the sand. Scrolling (or pointing at it, or pressing Enter on it)
 * lifts the frame, unrolls the shade, and its shadow opens into the hero.
 */
export function Entrance({ intro, hero, fabric }: { intro: HomeContent["intro"]; hero: HomeContent["hero"]; fabric: string }) {
  const root = useRef<HTMLElement>(null);
  const figure = useRef<OmbreHandle>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const opening = useRef(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);

    mm.add(
      { motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" },
      (ctx) => {
        if (ctx.conditions?.reduce) {
          // No scroll scene: the hero is simply there.
          gsap.set("[data-hero]", { clipPath: "none" });
          gsap.set("[data-stage]", { autoAlpha: 0 });
          return;
        }
        const pose = { lift: 0, canvas: 0 };
        const draw = () => figure.current?.set(pose.lift, pose.canvas);
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "+=170%",
            pin: true,
            scrub: 0.6,
          },
        });
        tl.to("[data-hint]", { autoAlpha: 0, y: 12, duration: 0.12 }, 0)
          .to(pose, { lift: 1, duration: 0.4, onUpdate: draw }, 0.02)
          .to(pose, { canvas: 1, duration: 0.36, onUpdate: draw }, 0.2)
          .to("[data-intro-title]", { autoAlpha: 0, y: -24, duration: 0.18 }, 0.5)
          .to("[data-figure]", { scale: 1.5, yPercent: 8, duration: 0.42, ease: "power1.in" }, 0.56)
          .fromTo(
            "[data-hero]",
            { clipPath: "circle(0% at 46% 66%)" },
            { clipPath: "circle(150% at 46% 66%)", duration: 0.4, ease: "power2.in" },
            0.58,
          )
          .fromTo("[data-hero-img]", { scale: 1.12 }, { scale: 1, duration: 0.42 }, 0.58)
          .fromTo("[data-hero-line]", { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.14, stagger: 0.04, ease: "power2.out" }, 0.84);
        trigger.current = tl.scrollTrigger ?? null;
        return () => {
          trigger.current = null;
        };
      },
    );

    // Gentle idle breathing of the folded frame, so it reads as something to touch.
    const idle = gsap.to(el.querySelector("[data-figure]"), { y: -6, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1 });
    const stop = () => idle.kill();
    window.addEventListener("scroll", stop, { once: true, passive: true });

    return () => {
      idle.kill();
      window.removeEventListener("scroll", stop);
      mm.revert();
    };
  }, []);

  // Pointing at the Ombre (or pressing it) plays the whole opening by scrolling through the scene.
  const open = () => {
    const st = trigger.current;
    if (!st || opening.current || st.progress > 0.6) return;
    opening.current = true;
    gsap.to(window, {
      scrollTo: st.end,
      duration: 2.8,
      ease: "power2.inOut",
      onComplete: () => {
        opening.current = false;
      },
    });
  };

  return (
    <section ref={root} className="relative h-[100svh] min-h-[560px] overflow-hidden bg-sand" aria-label="Welcome to OMBRE">
      {/* the stage: a folded Ombre on the sand */}
      <div data-stage className="absolute inset-0 flex flex-col items-center justify-center px-4 pb-16">
        <div data-intro-title className="text-center">
          <p className="eyebrow">{intro.eyebrow}</p>
          <p className="mt-4 font-display text-[44px] font-light leading-none tracking-tight md:text-[72px]">{intro.title}</p>
        </div>
        <div
          data-figure
          role="button"
          tabIndex={0}
          aria-label="Open the Ombre and enter the site"
          onPointerEnter={(e) => e.pointerType === "mouse" && open()}
          onClick={open}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open())}
          className="mt-2 w-full max-w-[600px] cursor-pointer rounded-sm outline-offset-8 will-change-transform"
        >
          <OmbreFigure ref={figure} fabric={fabric} className="h-auto w-full" />
        </div>
        <div data-hint className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-3 text-center">
          <p className="eyebrow">{intro.hint}</p>
          <span className="block h-10 w-px origin-top animate-[hint_2.2s_ease-in-out_infinite] bg-charcoal/50" aria-hidden />
        </div>
      </div>

      {/* the hero, revealed through the Ombre's shadow */}
      <div data-hero className="absolute inset-0 z-10 bg-sand" style={{ clipPath: "circle(0% at 46% 66%)" }}>
        <div className="grid h-full md:grid-cols-[1.05fr_1fr]">
          <div className="relative z-10 flex flex-col justify-end px-4 pb-12 pt-28 text-shell md:order-none md:px-10 md:pb-16 md:text-charcoal">
            <p data-hero-line className="eyebrow !text-current opacity-80">
              {hero.eyebrow}
            </p>
            <h1 data-hero-line className="mt-5 font-display text-[52px] font-light leading-[0.95] tracking-tight md:text-[88px] xl:text-[120px]">
              <Em text={hero.title} />
            </h1>
            <p data-hero-line className="mt-6 max-w-[40ch] text-[16px] leading-relaxed opacity-90 md:text-[17px]">
              {hero.text}
            </p>
            <div data-hero-line className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#shade" className="btn btn-primary">
                {hero.cta}
              </a>
              <a href="#discover" className="btn btn-ghost-light md:border-charcoal/30 md:text-charcoal md:hover:bg-charcoal md:hover:text-shell">
                {hero.cta2}
              </a>
            </div>
          </div>
          <div className="absolute inset-0 overflow-hidden md:relative md:inset-auto">
            <div data-hero-img className="absolute inset-0">
              <Image src={hero.image} alt={plain(hero.imageAlt)} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-sea-deep/85 via-sea-deep/25 to-transparent md:hidden" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
