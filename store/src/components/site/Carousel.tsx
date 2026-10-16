"use client";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface Slide {
  url: string;
  alt: string;
}

export function ImagePlaceholder({ label = "Image placeholder", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("grid place-items-center bg-linen text-sm text-ink-soft", className)}>
      <span className="rounded-full border border-dashed border-ink/30 px-4 py-2">{label}</span>
    </div>
  );
}

/** Swipeable image carousel (native scroll-snap) with arrows, counter and thumbnails. */
export function Carousel({ slides, label, placeholderLabel }: { slides: Slide[]; label: string; placeholderLabel?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (slides.length === 0) {
    return <ImagePlaceholder label={placeholderLabel ?? "No photos yet"} className="aspect-[4/5] w-full rounded-md" />;
  }

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(slides.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label}>
      <div className="group relative">
        <div
          ref={track}
          tabIndex={0}
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              go(index + 1);
            }
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              go(index - 1);
            }
          }}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-md bg-linen"
        >
          {slides.map((s, i) => (
            <div key={s.url + i} className="aspect-[4/5] w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt={s.alt} className="h-full w-full object-cover" loading={i === 0 ? "eager" : "lazy"} draggable={false} />
            </div>
          ))}
        </div>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-sand/90 text-xl shadow disabled:opacity-0 md:grid"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => go(index + 1)}
              disabled={index === slides.length - 1}
              className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-sand/90 text-xl shadow disabled:opacity-0 md:grid"
            >
              ›
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-3 py-1 text-xs text-sand" aria-live="polite">
              {index + 1} / {slides.length}
            </span>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {slides.map((s, i) => (
            <button
              key={s.url + i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index}
              className={cn("aspect-square overflow-hidden rounded border-2 bg-linen transition-opacity", i === index ? "border-lagoon" : "border-transparent opacity-60 hover:opacity-100")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
