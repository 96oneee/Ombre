import { cache } from "react";
import { getProductBySlug } from "./catalog";
import { getDelivery, getSettings } from "./settings";

/**
 * Words and pictures of the five homepage chapters.
 * Defaults use only confirmed OMBRE facts; the admin overrides any of them
 * through the `home` row in site_settings (a JSON object with the same shape).
 */
export interface HomeContent {
  productSlug: string;
  intro: { style: "classic" | "sun"; eyebrow: string; title: string; hint: string; frontImage: string; frontAlt: string; backImage: string; backAlt: string };
  hero: { eyebrow: string; title: string; text: string; image: string; imageAlt: string; cta: string; cta2: string };
  discovery: { eyebrow: string; title: string; facts: { title: string; text: string; image: string; alt: string }[] };
  shade: { eyebrow: string; title: string; text: string };
  how: { eyebrow: string; title: string; text: string; video: string; steps: { title: string; text: string; image: string; alt: string }[] };
  shopping: { eyebrow: string; title: string; steps: { title: string; text: string }[]; bandImage: string; bandTitle: string; bandCta: string };
}

export const HOME_DEFAULTS: HomeContent = {
  productSlug: "ombre",
  intro: {
    // "classic": fly into the shade · "sun": the sun crosses the sky and the shadow moves
    style: process.env.NEXT_PUBLIC_INTRO_STYLE === "classic" ? "classic" : "sun",
    eyebrow: "OMBRE",
    title: "Sun? Blocked!",
    hint: "Scroll to enter",
    frontImage: "/img/blue-cutout.webp",
    frontAlt: "The Ombre in Blue",
    backImage: "/img/beige-cutout.webp",
    backAlt: "The Ombre in Beige",
  },
  hero: {
    eyebrow: "OMBRE · Lebanon",
    title: "The Art of *Shade*",
    text: "The square folding shade you carry to the beach, set on the sand and lie back under. In Beige and Blue.",
    image: "/img/couple.jpg",
    imageAlt: "Two people lying on the sand under a Blue and a Beige Ombre",
    cta: "Shop now",
    cta2: "Discover",
  },
  discovery: {
    eyebrow: "The Ombre",
    title: "Made for *the sand*",
    facts: [
      { title: "A square of shade", text: "50 × 50 cm, square.", image: "/img/beige.jpg", alt: "Ombre in Beige, seen from the side" },
      { title: "A folding wooden frame", text: "The frame folds flat to carry and opens on the sand.", image: "/img/beige-detail.jpg", alt: "Close-up of the wooden frame" },
      { title: "Carry it, set it, lie back", text: "Take it to the beach, set it on the sand and lie back under it.", image: "/img/inuse.jpg", alt: "Two Ombres in use on the beach" },
      { title: "Beige and Blue", text: "Two colours, picked for the beach.", image: "/img/blue-detail.jpg", alt: "Close-up of the Blue Ombre" },
    ],
  },
  shade: { eyebrow: "Choose your shade", title: "Beige or *Blue*", text: "Same Ombre, two colours." },
  how: {
    eyebrow: "How it works",
    title: "Open in *a moment*",
    text: "Press a step to see it.",
    video: "",
    steps: [
      { title: "Unfold the frame", text: "The wooden frame folds open.", image: "/img/beige-detail.jpg", alt: "Close-up of the Ombre's wooden frame" },
      { title: "Set it on the sand", text: "Stand it on the sand where you want your shade.", image: "/img/blue.jpg", alt: "The Blue Ombre standing open" },
      { title: "Lie back in the shade", text: "Your own square of shade, right where you lie.", image: "/img/inuse-wide.jpg", alt: "Two people lying under their Ombres on the beach" },
    ],
  },
  shopping: {
    eyebrow: "Effortless shopping",
    title: "Order in *a minute*",
    steps: [
      { title: "Order online", text: "Pick your colour and send your address. No account, no card." },
      { title: "We confirm on WhatsApp", text: "We message you on WhatsApp to confirm before we deliver." },
      { title: "Pay cash on delivery", text: "{fee} delivery anywhere in Lebanon. Pay when it arrives." },
    ],
    bandImage: "/img/shore.jpg",
    bandTitle: "Sun? *Blocked.*",
    bandCta: "Shop the Ombre",
  },
};

function merge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== "object" || Array.isArray(base)) return (over ?? base) as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    const b = (base as Record<string, unknown>)[k];
    out[k] = b && typeof b === "object" && !Array.isArray(b) ? merge(b, v) : v;
  }
  return out as T;
}

export const getHome = cache(async () => {
  const settings = await getSettings();
  const content = merge(HOME_DEFAULTS, (settings as unknown as Record<string, unknown>).home);
  const [product, delivery] = await Promise.all([getProductBySlug(content.productSlug), getDelivery()]);
  return { content, settings, product, delivery: delivery.settings };
});
