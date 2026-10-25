"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap, type ScrollTrigger } from "@/lib/gsap";
import type { HomeContent } from "@/lib/home";
import { Em, plain } from "./Em";

/**
 * Chapter 1 · Cinematic arrival, with the real product.
 * The Blue Ombre (cut out of its studio photo) floats on the sand and follows the pointer.
 * Scrolling, pointing at it or pressing it turns it to face you, brings the Beige one out beside it,
 * then flies into the blue shade, which opens into the hero.
 */
export function Entrance({ intro, hero, fabric }: { intro: HomeContent["intro"]; hero: HomeContent["hero"]; fabric: string }) {
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const opening = useRef(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const mm = gsap.matchMedia(el);

    mm.add(
      { motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" },
      (ctx) => {
        if (ctx.conditions?.reduce) {
          gsap.set(q("[data-hero]"), { clipPath: "none" });
          gsap.set(q("[data-stage]"), { autoAlpha: 0 });
          return;
        }

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: "top top", end: "+=180%", pin: true, scrub: 0.7 },
        });
        tl.to(q("[data-hint]"), { autoAlpha: 0, y: 12, duration: 0.1 }, 0)
          // the Blue turns to face you while the Beige comes out from behind it
          .fromTo(q("[data-front]"), { rotateY: -18, rotateX: 6, scale: 0.9, transformPerspective: 1400 }, { rotateY: 0, rotateX: 0, scale: 1, duration: 0.3, ease: "power1.out" }, 0.02)
          .fromTo(q("[data-back]"), { autoAlpha: 0, xPercent: 0, yPercent: 4, rotate: 0 }, { autoAlpha: 1, xPercent: -46, yPercent: -8, rotate: -5, duration: 0.3, ease: "power2.out" }, 0.04)
          .to(q("[data-shadow]"), { scaleX: 1.35, opacity: 0.55, duration: 0.3 }, 0.02)
          .to(q("[data-intro-title]"), { autoAlpha: 0, y: -24, duration: 0.14 }, 0.32)
          .to(q("[data-back]"), { autoAlpha: 0, xPercent: -70, duration: 0.14 }, 0.34)
          .to(q("[data-shadow]"), { autoAlpha: 0, duration: 0.1 }, 0.36)
          // then the camera flies into the blue shade
          .to(q("[data-front]"), { scale: 9, duration: 0.32, ease: "power2.in" }, 0.36)
          .fromTo(q("[data-veil]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.14 }, 0.52)
          .fromTo(q("[data-hero]"), { clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(150% at 50% 50%)", duration: 0.34, ease: "power2.in" }, 0.64)
          .fromTo(q("[data-hero-img]"), { scale: 1.14 }, { scale: 1, duration: 0.36 }, 0.64)
          .fromTo(q("[data-hero-line]"), { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.12, stagger: 0.035, ease: "power2.out" }, 0.86);
        trigger.current = tl.scrollTrigger ?? null;

        // the product follows the pointer a little, like holding it in your hand
        const tilt = q("[data-tilt]")[0];
        const rx = gsap.quickTo(tilt, "rotateX", { duration: 0.9, ease: "power3.out" });
        const ry = gsap.quickTo(tilt, "rotateY", { duration: 0.9, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          const calm = 1 - Math.min(1, (trigger.current?.progress ?? 0) * 4);
          ry(((e.clientX / window.innerWidth) * 2 - 1) * 10 * calm);
          rx(-((e.clientY / window.innerHeight) * 2 - 1) * 7 * calm);
        };
        window.addEventListener("pointermove", onMove);
        const idle = gsap.to(q("[data-float]"), { y: -10, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 });

        return () => {
          window.removeEventListener("pointermove", onMove);
          idle.kill();
          trigger.current = null;
        };
      },
    );
    return () => mm.revert();
  }, []);

  // Pointing at the Ombre (or pressing it) plays the whole opening by scrolling through the scene.
  const open = () => {
    const st = trigger.current;
    if (!st || opening.current || st.progress > 0.6) return;
    opening.current = true;
    const done = () => void (opening.current = false);
    // autoKill: any scroll by the visitor takes over from the automatic opening
    gsap.to(window, { scrollTo: { y: st.end, autoKill: true }, duration: 3.2, ease: "power2.inOut", onComplete: done, onInterrupt: done });
  };

  return (
    <section ref={root} className="relative h-[100svh] min-h-[560px] overflow-hidden bg-sand" aria-label="Welcome to OMBRE">
      <div data-stage className="absolute inset-0 flex flex-col items-center justify-center px-4 pb-20">
        <div data-intro-title className="relative z-10 text-center">
          <p className="eyebrow">{intro.eyebrow}</p>
          <p className="mt-4 font-display text-[44px] font-light leading-none tracking-tight md:text-[76px]">{intro.title}</p>
        </div>

        <div className="relative mt-6 w-[min(84vw,640px)] [perspective:1400px] md:mt-10">
          <div
            data-shadow
            aria-hidden
            className="absolute inset-x-[8%] bottom-[-6%] h-[16%] rounded-[50%] bg-charcoal opacity-30 blur-2xl"
          />
          <div data-float>
            <div data-tilt className="relative aspect-[725/539]">
              <div data-back className="absolute inset-[6%_4%_4%_8%] z-0 opacity-0">
                <Image src={intro.backImage} alt={plain(intro.backAlt)} fill sizes="(min-width: 768px) 560px, 76vw" className="object-contain" />
              </div>
              <div
                data-front
                role="button"
                tabIndex={0}
                aria-label="Open the Ombre and enter the site"
                onPointerEnter={(e) => e.pointerType === "mouse" && open()}
                onClick={open}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open())}
                className="absolute inset-0 z-10 cursor-pointer [transform-origin:58%_58%] [transform:perspective(1400px)_rotateY(-18deg)_rotateX(6deg)_scale(0.9)]"
              >
                <Image src={intro.frontImage} alt={plain(intro.frontAlt)} fill priority sizes="(min-width: 768px) 640px, 84vw" className="object-contain drop-shadow-[0_30px_30px_rgba(31,35,37,0.18)]" />
              </div>
            </div>
          </div>
        </div>

        <div data-hint className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-3 text-center">
          <p className="eyebrow">{intro.hint}</p>
          <span className="block h-10 w-px origin-top animate-[hint_2.2s_ease-in-out_infinite] bg-charcoal/50" aria-hidden />
        </div>
      </div>

      {/* the blue of the shade fills the screen as we fly into it */}
      <div data-veil aria-hidden className="pointer-events-none absolute inset-0 opacity-0" style={{ backgroundColor: fabric }} />

      {/* the hero, opening out of the shade */}
      <div data-hero className="absolute inset-0 z-10 bg-sand" style={{ clipPath: "circle(0% at 50% 50%)" }}>
        <div className="grid h-full md:grid-cols-[1.05fr_1fr]">
          <div className="relative z-10 flex flex-col justify-end px-4 pb-12 pt-28 text-shell md:px-10 md:pb-16 md:text-charcoal">
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
