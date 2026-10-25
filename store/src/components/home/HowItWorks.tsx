"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import type { HomeContent } from "@/lib/home";
import { cn } from "@/lib/utils";
import { Em } from "./Em";
import { OmbreFigure, type OmbreHandle } from "./OmbreFigure";

// Where each step sits on the 0..100 opening scale.
const STOPS = [0, 50, 100, 100];

/**
 * Chapter 4 · How it works. An interactive demonstration: steps and a slider open the drawn Ombre.
 * When real footage is added, the video takes the drawing's place and the steps seek to its moments.
 */
export function HowItWorks({ c, fabric, photo }: { c: HomeContent["how"]; fabric: string; photo: string }) {
  const root = useRef<HTMLElement>(null);
  const figure = useRef<OmbreHandle>(null);
  const state = useRef({ value: 0 });
  const [value, setValue] = useState(0);
  const [step, setStep] = useState(0);

  const draw = useCallback((v: number) => {
    figure.current?.set(Math.min(1, v / 50), Math.max(0, (v - 50) / 50));
    setValue(Math.round(v));
  }, []);

  const goTo = useCallback(
    (v: number, duration = 1.4) => {
      gsap.killTweensOf(state.current);
      gsap.to(state.current, { value: v, duration, ease: "power2.inOut", onUpdate: () => draw(state.current.value) });
    },
    [draw],
  );

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // play the opening once, the first time the chapter comes into view
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 55%",
      once: true,
      onEnter: () => {
        setStep(2);
        goTo(100, 3);
      },
    });
    return () => st.kill();
  }, [goTo]);

  const choose = (k: number) => {
    setStep(k);
    goTo(STOPS[k]);
  };

  const onSlide = (v: number) => {
    gsap.killTweensOf(state.current);
    state.current.value = v;
    draw(v);
    setStep(v < 25 ? 0 : v < 75 ? 1 : 2);
  };

  return (
    <section id="how" ref={root} className="scroll-mt-16 bg-shell py-24 md:py-40" aria-labelledby="how-title">
      <div className="container-x">
        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-6">
            <p className="eyebrow">{c.eyebrow}</p>
            <h2 id="how-title" className="mt-4 font-display text-[44px] font-light leading-none md:text-[80px]">
              <Em text={c.title} />
            </h2>
          </div>
          <p className="max-w-[38ch] self-end text-[16px] leading-relaxed text-mist md:col-span-4 md:col-start-9">{c.text}</p>
        </div>

        <div className="mt-14 grid gap-10 md:mt-20 md:grid-cols-12">
          <div className="relative overflow-hidden bg-sand md:col-span-8">
            <OmbreFigure ref={figure} fabric={fabric} className="relative z-0 h-auto w-full" title="Drawing of the Ombre opening" />
            <div className={cn("absolute inset-0 transition-opacity duration-700", step === 3 ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={step !== 3}>
              <Image src={photo} alt="The Ombre in use on the beach" fill sizes="(min-width: 768px) 66vw, 100vw" className="object-cover" />
            </div>
            <label className="absolute inset-x-4 bottom-4 flex items-center gap-4 bg-shell/90 px-4 py-3 backdrop-blur md:inset-x-6 md:bottom-6">
              <span className="eyebrow shrink-0">Open</span>
              <input
                type="range"
                min={0}
                max={100}
                value={value}
                onChange={(e) => onSlide(Number(e.target.value))}
                className="h-1 w-full cursor-pointer accent-sea"
                aria-label="Drag to open the Ombre"
              />
            </label>
          </div>

          <ol className="flex snap-x gap-3 overflow-x-auto pb-2 md:col-span-4 md:flex-col md:gap-0 md:overflow-visible md:pb-0">
            {c.steps.map((s, k) => (
              <li key={s.title + k} className="min-w-[72%] snap-start md:min-w-0">
                <button
                  type="button"
                  onClick={() => choose(k)}
                  aria-pressed={step === k}
                  className={cn(
                    "h-full w-full border-t py-6 text-left transition-colors md:py-7",
                    step === k ? "border-charcoal" : "border-charcoal/15 text-mist hover:text-charcoal",
                  )}
                >
                  <span className={cn("font-display text-[20px] italic", step === k ? "text-wood" : "")}>{String(k + 1).padStart(2, "0")}</span>
                  <span className="mt-2 block font-display text-[28px] leading-tight text-charcoal md:text-[32px]">{s.title}</span>
                  <span className="mt-2 block text-[15px] leading-relaxed">{s.text}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
