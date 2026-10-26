"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap, type ScrollTrigger } from "@/lib/gsap";
import type { HomeContent } from "@/lib/home";
import { cn } from "@/lib/utils";
import { Em, plain } from "./Em";

/**
 * Chapter 1 · Cinematic arrival, "sun" version.
 * The real Beige and Blue Ombres stand on the beach; the one you pick unfolds while the other folds away.
 * The sun crosses the sky as you scroll (and leans toward your pointer), each Ombre's own shadow swings around it,
 * and at noon the sun floods the screen and the hero opens out of the light. Only scrolling opens the site.
 */
type Shade = "beige" | "blue";

// tells the site header (SiteTop) whether the opening is on screen
function setIntro(active: boolean) {
  if (window.__ombreIntro === active) return;
  window.__ombreIntro = active;
  window.dispatchEvent(new CustomEvent("ombre:intro", { detail: active }));
}

// folded (and hidden): the frame lies low and its two halves close in on the middle, like the real Ombre folded flat
const FOLDED = { lift: 0.42, close: 74, scale: 0.9 };

export function EntranceSun({ intro, hero }: { intro: HomeContent["intro"]; hero: HomeContent["hero"] }) {
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [pick, setPick] = useState<Shade>("blue");
  const first = useRef(true);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const mm = gsap.matchMedia(el);

    mm.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        reduce: "(prefers-reduced-motion: reduce)",
      },
      (ctx) => {
        if (ctx.conditions?.reduce) {
          setIntro(false);
          gsap.set(q("[data-hero]"), { clipPath: "none" });
          gsap.set(q("[data-stage]"), { autoAlpha: 0 });
          return;
        }

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "+=200%",
            pin: true,
            scrub: 0.8,
            // the site header stays away until the visitor is almost through the opening
            onUpdate: (st) => setIntro(st.progress < 0.85),
          },
        });
        tl.to(q("[data-hint]"), { autoAlpha: 0, y: 12, duration: 0.08 }, 0)
          // the sun crosses the sky: rising to noon, then on toward the hero
          .fromTo(q("[data-sun]"), { left: "14%" }, { left: "70%", duration: 0.5 }, 0)
          .fromTo(q("[data-sun]"), { top: "34%" }, { top: "12%", duration: 0.25, ease: "sine.out" }, 0)
          .to(q("[data-sun]"), { top: "22%", duration: 0.25, ease: "sine.in" }, 0.25)
          // the Ombre's shadow swings round as the light moves over it
          .fromTo(q("[data-shadow]"), { skewX: 48, opacity: 0.22 }, { skewX: 0, opacity: 0.42, duration: 0.25 }, 0)
          .to(q("[data-shadow]"), { skewX: -48, opacity: 0.24, duration: 0.25 }, 0.25)
          .fromTo(q("[data-product=blue]"), { rotateY: -14, transformPerspective: 1400 }, { rotateY: 12, duration: 0.5 }, 0)
          .fromTo(q("[data-product=beige]"), { rotateY: 14, transformPerspective: 1400 }, { rotateY: -10, duration: 0.5 }, 0)
          .to(q("[data-intro-title]"), { autoAlpha: 0, y: -30, duration: 0.12 }, 0.36)
          .to(q("[data-picker]"), { autoAlpha: 0, duration: 0.08 }, 0.36)
          // noon: the light floods everything
          .to(q("[data-product], [data-shadow]"), { autoAlpha: 0, y: 30, duration: 0.12, stagger: 0.02 }, 0.5)
          .to(q("[data-sun]"), { scale: 22, duration: 0.2, ease: "power2.in" }, 0.5)
          .fromTo(
            q("[data-hero]"),
            { clipPath: "circle(0% at 72% 24%)" },
            {
              clipPath: "circle(160% at 72% 24%)",
              duration: 0.32,
              ease: "power2.in",
            },
            0.66,
          )
          .fromTo(q("[data-hero-img]"), { scale: 1.15 }, { scale: 1, duration: 0.34 }, 0.66)
          .fromTo(
            q("[data-hero-line]"),
            { autoAlpha: 0, y: 28 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.1,
              stagger: 0.03,
              ease: "power2.out",
            },
            0.88,
          );
        trigger.current = tl.scrollTrigger ?? null;
        setIntro((trigger.current?.progress ?? 1) < 0.85);

        // before scrolling, the sun leans toward the pointer and the shadow answers
        const sx = gsap.quickTo(q("[data-sun-lean]")[0], "x", {
          duration: 1.2,
          ease: "power3.out",
        });
        const sy = gsap.quickTo(q("[data-sun-lean]")[0], "y", {
          duration: 1.2,
          ease: "power3.out",
        });
        const sk = gsap.quickTo(q("[data-shadow-lean]"), "skewX", {
          duration: 1.2,
          ease: "power3.out",
        });
        const onMove = (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          const calm = 1 - Math.min(1, (trigger.current?.progress ?? 0) * 5);
          const nx = (e.clientX / window.innerWidth) * 2 - 1;
          const ny = (e.clientY / window.innerHeight) * 2 - 1;
          sx(nx * 140 * calm);
          sy(ny * 50 * calm);
          sk(-nx * 22 * calm);
        };
        window.addEventListener("pointermove", onMove);
        const breathe = gsap.to(q("[data-glow]"), {
          scale: 1.12,
          opacity: 0.75,
          duration: 2.6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });

        return () => {
          window.removeEventListener("pointermove", onMove);
          breathe.kill();
          trigger.current = null;
          setIntro(false);
        };
      },
    );
    return () => mm.revert();
  }, []);

  // the picked Ombre unfolds, the other one folds away
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // on load the Ombre unfolds after the title; on a switch, once the other one has folded away
    const wait = first.current ? 0.9 : 0.45;
    first.current = false;
    const tweens = (["beige", "blue"] as Shade[]).flatMap((k) => {
      const on = k === pick;
      const t = { duration: still ? 0 : on ? 1.4 : 0.8, delay: still ? 0 : on ? wait + 0.25 : 0, overwrite: true };
      return [
        gsap.to(q(`[data-fig=${k}]`), { scale: on ? 1 : FOLDED.scale, autoAlpha: on ? 1 : 0, zIndex: on ? 10 : 0, ...t, ease: "power3.inOut" }),
        gsap.to(q(`[data-fold=${k}]`), { scaleY: on ? 1 : FOLDED.lift, ...t, ease: on ? "back.out(1.5)" : "power2.inOut" }),
        gsap.to(q(`[data-half=${k}-l]`), { rotateY: on ? 0 : FOLDED.close, ...t, ease: on ? "power3.out" : "power2.in" }),
        gsap.to(q(`[data-half=${k}-r]`), { rotateY: on ? 0 : -FOLDED.close, ...t, ease: on ? "power3.out" : "power2.in" }),
        gsap.to(q(`[data-shadow-fold=${k}]`), { scaleX: on ? 1 : 0.3, ...t, ease: "power2.inOut" }),
      ];
    });
    return () => tweens.forEach((tw) => tw.kill());
  }, [pick]);

  const pair = [
    {
      src: intro.backImage,
      alt: intro.backAlt,
      key: "beige" as Shade,
      label: "Beige",
      hex: "#E8DFD1",
      ratio: "aspect-[674/468]",
    },
    {
      src: intro.frontImage,
      alt: intro.frontAlt,
      key: "blue" as Shade,
      label: "Blue",
      hex: "#2AA7CC",
      ratio: "aspect-[725/539]",
    },
  ];
  const letters = Array.from(intro.title);

  return (
    <section ref={root} data-intro className="relative h-[100svh] min-h-[600px] overflow-hidden bg-sand" aria-label="Welcome to OMBRE">
      <div
        data-stage
        className="absolute inset-0 overflow-hidden"
        style={{
          background: "linear-gradient(180deg,#F7E8CF 0%,#F4EBDD 40%,#F2EDE3 50%,#E8DDC8 100%)",
        }}
      >
        {/* the sun, with its breathing glow */}
        <div data-sun className="absolute z-0 -translate-x-1/2 -translate-y-1/2" style={{ left: "14%", top: "34%" }}>
          <div data-sun-lean>
            <div
              data-glow
              aria-hidden
              className="absolute left-1/2 top-1/2 h-[46vmin] w-[46vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60"
              style={{
                background: "radial-gradient(circle, rgba(255,214,150,.75) 0%, rgba(255,214,150,0) 65%)",
              }}
            />
            <div
              aria-hidden
              className="relative h-[11vmin] w-[11vmin] rounded-full"
              style={{
                background: "radial-gradient(circle at 40% 40%, #FFF6E2 0%, #FFD99A 55%, #F2B766 100%)",
                boxShadow: "0 0 80px 20px rgba(255,205,130,.45)",
              }}
            />
          </div>
        </div>

        {/* the sea on the horizon, moving */}
        <div aria-hidden className="absolute inset-x-0 top-[44%] h-[6%] overflow-hidden">
          <svg className="absolute inset-y-0 left-0 h-full w-[200%] animate-[sea_14s_linear_infinite]" viewBox="0 0 1200 40" preserveAspectRatio="none">
            <path d="M0 14 Q 75 4 150 14 T 300 14 T 450 14 T 600 14 T 750 14 T 900 14 T 1050 14 T 1200 14 V40 H0Z" fill="#0E3A48" opacity=".14" />
            <path d="M0 22 Q 75 12 150 22 T 300 22 T 450 22 T 600 22 T 750 22 T 900 22 T 1050 22 T 1200 22 V40 H0Z" fill="#2AA7CC" opacity=".16" />
          </svg>
        </div>

        {/* drifting glints of light */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              className="absolute block h-1 w-1 rounded-full bg-white/80 animate-[glint_7s_ease-in-out_infinite]"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${30 + ((i * 53) % 55)}%`,
                animationDelay: `${(i * 0.53) % 7}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 pb-6 pt-10">
          <div data-intro-title className="text-center">
            <h2 className="sr-only">{intro.eyebrow}</h2>
            <div
              aria-hidden
              className="mx-auto aspect-[828/232] w-[min(80vw,560px,calc(100svh*0.55))] animate-[letter_1.4s_cubic-bezier(.22,1,.36,1)_both] bg-sea"
              style={{ mask: "url(/img/wordmark-name.svg) no-repeat center / contain", WebkitMask: "url(/img/wordmark-name.svg) no-repeat center / contain" }}
            />
            <p className="mt-3 font-display text-[24px] font-light italic leading-none tracking-tight text-charcoal/80 md:mt-4 md:text-[34px]" aria-label={intro.title}>
              {letters.map((ch, i) => (
                <span key={i} aria-hidden className="inline-block animate-[letter_1.1s_cubic-bezier(.22,1,.36,1)_both]" style={{ animationDelay: `${0.5 + i * 0.04}s` }}>
                  {ch === " " ? "\u00A0" : ch}
                </span>
              ))}
            </p>
          </div>

          {/* the real Ombre in the picked colour, on the sand (both stacked, one shown) */}
          <div className="relative mt-6 grid w-[min(84vw,520px,calc((100svh-400px)*1.3))] items-end md:mt-8">
            {pair.map((o) => (
              <figure
                key={o.key}
                data-fig={o.key}
                className="relative col-start-1 row-start-1 origin-bottom"
                style={{ transform: `scale(${FOLDED.scale})`, opacity: 0, visibility: "hidden" }}
              >
                {/* the Ombre's own silhouette as its shadow on the sand */}
                <div data-shadow className="pointer-events-none absolute inset-x-0 bottom-[2%] h-full origin-bottom" style={{ opacity: 0.22 }} aria-hidden>
                  <div data-shadow-lean className="h-full w-full origin-bottom">
                    <div data-shadow-fold={o.key} className="h-full w-full origin-bottom" style={{ transform: "scaleX(0.3)" }}>
                      <div className="relative h-full w-full origin-bottom [transform:scaleY(-0.32)]">
                        <Image src={o.src} alt="" fill sizes="490px" className="object-contain object-bottom blur-[5px] brightness-0" />
                      </div>
                    </div>
                  </div>
                </div>
                <div data-product={o.key} className={cn("relative", o.ratio)}>
                  <div data-fold={o.key} className="absolute inset-0 origin-bottom" style={{ transform: `scaleY(${FOLDED.lift})` }}>
                    {/* the photo in two halves that open out from the middle */}
                    {(["l", "r"] as const).map((side) => (
                      <div
                        key={side}
                        data-half={`${o.key}-${side}`}
                        className="absolute inset-0 origin-center"
                        style={{
                          clipPath: side === "l" ? "inset(0 49.7% 0 0)" : "inset(0 0 0 49.7%)",
                          transform: `perspective(1200px) rotateY(${side === "l" ? FOLDED.close : -FOLDED.close}deg)`,
                        }}
                      >
                        <Image src={o.src} alt={side === "l" ? plain(o.alt) : ""} fill priority sizes="(min-width: 768px) 490px, 47vw" className="object-contain" />
                      </div>
                    ))}
                  </div>
                </div>
              </figure>
            ))}
          </div>

          {/* pick a colour: that Ombre unfolds */}
          <div data-picker className="relative z-20 mt-8 flex items-center gap-3 md:mt-10" role="group" aria-label="Choose your colour">
            {pair.map((o) => (
              <button
                key={o.key}
                type="button"
                aria-pressed={pick === o.key}
                onClick={() => setPick(o.key)}
                className={cn(
                  "flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors",
                  pick === o.key ? "border-charcoal bg-charcoal text-shell" : "border-charcoal/25 bg-shell/60 text-charcoal hover:border-charcoal/70",
                )}
              >
                <span className="h-3.5 w-3.5 rounded-full ring-1 ring-current/30" style={{ backgroundColor: o.hex }} aria-hidden />
                {o.label}
              </button>
            ))}
          </div>

          <div data-hint className="pointer-events-none mt-6 flex flex-col items-center gap-3 text-center md:mt-8">
            <p className="eyebrow">{intro.hint}</p>
            <span className="block h-8 w-px origin-top animate-[hint_2.2s_ease-in-out_infinite] bg-charcoal/50" aria-hidden />
          </div>
        </div>

      </div>

      {/* the hero, opening out of the light */}
      <div data-hero className="absolute inset-0 z-20 bg-sand" style={{ clipPath: "circle(0% at 72% 24%)" }}>
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
              <Image src={hero.image} alt={plain(hero.imageAlt)} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-sea-deep/85 via-sea-deep/25 to-transparent md:hidden" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
