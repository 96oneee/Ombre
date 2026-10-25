"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import type { HomeContent } from "@/lib/home";
import { cn } from "@/lib/utils";
import { Em } from "./Em";

const STEP_MS = 4200;

/**
 * Chapter 4 · How it works, with real photos of the Ombre.
 * Steps play on their own while the chapter is in view; pressing one jumps to it.
 * When a video is set in the admin, it plays in place of the photos.
 */
export function HowItWorks({ c }: { c: HomeContent["how"] }) {
  const root = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const steps = c.steps;

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const st = ScrollTrigger.create({ trigger: el, start: "top 60%", end: "bottom 40%", onToggle: (s) => setPlaying(s.isActive) });
    return () => st.kill();
  }, []);

  useEffect(() => {
    if (!playing || c.video) return;
    const t = window.setTimeout(() => setStep((s) => (s + 1) % steps.length), STEP_MS);
    return () => window.clearTimeout(t);
  }, [playing, step, steps.length, c.video]);

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
          <div className="relative aspect-[4/5] overflow-hidden bg-dune md:col-span-7 md:aspect-[5/4]">
            {c.video ? (
              <video src={c.video} className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline />
            ) : (
              steps.map((s, k) => (
                <Image
                  key={s.image + k}
                  src={s.image}
                  alt={k === step ? s.alt : ""}
                  aria-hidden={k !== step}
                  fill
                  sizes="(min-width: 768px) 58vw, 100vw"
                  className={cn(
                    "object-cover transition-[opacity,transform] ease-shade",
                    k === step ? "scale-100 opacity-100 duration-[1400ms]" : "scale-[1.08] opacity-0 duration-[900ms]",
                  )}
                />
              ))
            )}
            {!c.video && (
              <div className="absolute inset-x-0 bottom-0 flex gap-1.5 p-4 md:p-6" aria-hidden>
                {steps.map((_, k) => (
                  <span key={k} className="h-[2px] flex-1 overflow-hidden bg-shell/40">
                    <span
                      key={`${k}-${step}-${playing}`}
                      className={cn("block h-full bg-shell", k < step ? "w-full" : k === step && playing ? "animate-[fill_linear_forwards]" : "w-0")}
                      style={k === step && playing ? { animationDuration: `${STEP_MS}ms` } : undefined}
                    />
                  </span>
                ))}
              </div>
            )}
          </div>

          <ol className="flex flex-col md:col-span-5 md:justify-center md:pl-6">
            {steps.map((s, k) => (
              <li key={s.title + k}>
                <button
                  type="button"
                  onClick={() => setStep(k)}
                  aria-pressed={step === k}
                  className={cn("w-full border-t py-6 text-left transition-colors md:py-8", step === k ? "border-charcoal" : "border-charcoal/15 text-mist hover:text-charcoal")}
                >
                  <span className={cn("font-display text-[20px] italic", step === k && "text-wood")}>{String(k + 1).padStart(2, "0")}</span>
                  <span className="mt-2 block font-display text-[30px] leading-tight text-charcoal md:text-[40px]">{s.title}</span>
                  <span className={cn("block overflow-hidden text-[15px] leading-relaxed transition-[max-height,opacity,margin] duration-500", step === k ? "mt-2 max-h-24 opacity-100" : "max-h-0 opacity-0")}>
                    {s.text}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
