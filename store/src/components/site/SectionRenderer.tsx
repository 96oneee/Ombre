/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getActiveProducts, getProductById } from "@/lib/catalog";
import { formatMoney } from "@/lib/pricing";
import { currencyOf, type SiteSettings } from "@/lib/settings";
import { BUCKETS, publicUrl } from "@/lib/storage";
import type { CatalogProduct, PageSection } from "@/lib/types";
import { cn, safeHref } from "@/lib/utils";
import { ImagePlaceholder } from "./Carousel";

type C = Record<string, any>;

const site = (path?: string | null) => publicUrl(BUCKETS.site, path);

function Paragraphs({ text, className }: { text?: string; className?: string }) {
  const parts = (text ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  return (
    <div className={cn("paragraphs", className)}>
      {parts.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function LinkButton({ label, href, variant = "primary" }: { label?: string; href?: string; variant?: "primary" | "outline" | "light" }) {
  if (!label) return null;
  const cls = variant === "primary" ? "btn-primary" : variant === "light" ? "btn-light" : "btn-outline";
  return (
    <Link href={safeHref(href)} className={cn("btn", cls)}>
      {label}
    </Link>
  );
}

function Hero({ c }: { c: C }) {
  const img = site(c.image_path);
  const vid = site(c.video_path);
  const hasMedia = !!(img || vid);
  const center = c.text_align === "center";
  return (
    <section className={cn("relative isolate flex min-h-[78vh] items-end overflow-hidden", hasMedia ? "text-sand" : "bg-linen text-ink")}>
      {vid ? (
        <video className="absolute inset-0 -z-10 h-full w-full object-cover" src={vid} poster={img ?? undefined} autoPlay muted loop playsInline />
      ) : img ? (
        <img src={img} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      ) : (
        <ImagePlaceholder label="Hero image or video placeholder" className="absolute inset-0 -z-10 bg-transparent" />
      )}
      {hasMedia && <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/75 via-ink/25 to-transparent" />}
      <div className={cn("container-x pb-14 pt-32 md:pb-20", center && "text-center")}>
        {c.title && <h1 className={cn("max-w-4xl text-6xl leading-[0.95] md:text-8xl", center && "mx-auto")}>{c.title}</h1>}
        {c.subtitle && <p className={cn("mt-6 max-w-xl text-lg md:text-xl", center && "mx-auto", hasMedia ? "text-sand/90" : "text-ink-soft")}>{c.subtitle}</p>}
        {(c.button1_label || c.button2_label) && (
          <div className={cn("mt-8 flex flex-wrap gap-3", center && "justify-center")}>
            <LinkButton label={c.button1_label} href={c.button1_href} variant={hasMedia ? "light" : "primary"} />
            <LinkButton label={c.button2_label} href={c.button2_href} variant={hasMedia ? "outline" : "outline"} />
          </div>
        )}
      </div>
    </section>
  );
}

function TextSection({ c }: { c: C }) {
  const center = c.align === "center";
  return (
    <section className="container-x py-20 md:py-28">
      <div className={cn("max-w-3xl", center && "mx-auto text-center")}>
        {c.title && <h2 className="text-4xl md:text-6xl">{c.title}</h2>}
        <Paragraphs text={c.body} className={cn("text-lg leading-relaxed text-ink-soft", c.title && "mt-6")} />
      </div>
    </section>
  );
}

function ImageSection({ c }: { c: C }) {
  const img = site(c.image_path);
  const full = c.width !== "contained";
  return (
    <section className={cn("py-10 md:py-16", !full && "container-x")}>
      <figure>
        {img ? <img src={img} alt={c.alt ?? ""} className={cn("w-full object-cover", full ? "max-h-[85vh]" : "rounded-md")} /> : <ImagePlaceholder label="Image placeholder" className={cn("aspect-[16/9] w-full", !full && "rounded-md")} />}
        {c.caption && <figcaption className="container-x mt-3 text-sm text-ink-soft">{c.caption}</figcaption>}
      </figure>
    </section>
  );
}

function ImageText({ c }: { c: C }) {
  const img = site(c.image_path);
  const right = c.image_side !== "left";
  return (
    <section className="container-x py-16 md:py-24">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <div className={cn(right && "md:order-2")}>
          {img ? <img src={img} alt={c.alt ?? ""} className="aspect-[4/5] w-full rounded-md object-cover" loading="lazy" /> : <ImagePlaceholder label="Image placeholder" className="aspect-[4/5] w-full rounded-md" />}
        </div>
        <div className={cn(right && "md:order-1")}>
          {c.title && <h2 className="text-4xl md:text-6xl">{c.title}</h2>}
          <Paragraphs text={c.body} className={cn("max-w-lg text-lg leading-relaxed text-ink-soft", c.title && "mt-6")} />
          {c.button_label && (
            <div className="mt-8">
              <LinkButton label={c.button_label} href={c.button_href} variant="outline" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CallToAction({ c }: { c: C }) {
  return (
    <section className="container-x py-16 md:py-24">
      <div className="rounded-md bg-lagoon px-6 py-16 text-center text-sand md:px-16 md:py-24">
        {c.title && <h2 className="mx-auto max-w-3xl text-4xl md:text-6xl">{c.title}</h2>}
        {c.body && <p className="mx-auto mt-5 max-w-xl text-lg text-sand/90">{c.body}</p>}
        {c.button_label && (
          <div className="mt-8">
            <LinkButton label={c.button_label} href={c.button_href} variant="light" />
          </div>
        )}
      </div>
    </section>
  );
}

function Gallery({ c }: { c: C }) {
  const paths: string[] = Array.isArray(c.images) ? c.images : [];
  const urls = paths.map((p) => site(p)).filter(Boolean) as string[];
  return (
    <section className="container-x py-16 md:py-24">
      {c.title && <h2 className="mb-8 text-4xl md:text-6xl">{c.title}</h2>}
      {urls.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {urls.map((u, i) => (
            <img key={u + i} src={u} alt="" className="aspect-square w-full rounded-md object-cover" loading="lazy" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <ImagePlaceholder key={i} label="Gallery image placeholder" className="aspect-square rounded-md" />
          ))}
        </div>
      )}
    </section>
  );
}

async function FeaturedProduct({ c, settings }: { c: C; settings: SiteSettings }) {
  let product: CatalogProduct | null = null;
  if (c.product_id) product = await getProductById(c.product_id);
  if (!product) product = (await getActiveProducts())[0] ?? null;
  const currency = currencyOf(settings);
  const cover = publicUrl(BUCKETS.products, product?.cover_path);

  return (
    <section className="bg-linen py-16 md:py-24">
      <div className="container-x grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <div>
          {cover ? <img src={cover} alt={product?.name ?? ""} className="aspect-[4/5] w-full rounded-md object-cover" loading="lazy" /> : <ImagePlaceholder label={product ? "Product photo placeholder" : "No active products yet"} className="aspect-[4/5] w-full rounded-md bg-sand" />}
        </div>
        <div>
          {c.title && <h2 className="text-4xl md:text-6xl">{c.title}</h2>}
          <p className="mt-6 font-display text-3xl">{product?.name ?? "Product name"}</p>
          {product && <p className="mt-1 text-ink-soft">From {formatMoney(product.price_from, currency)}</p>}
          <Paragraphs text={c.body || product?.short_description || ""} className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft" />
          {product && product.variants.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Available colors">
              {product.variants.map((v) => (
                <li key={v.id} className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-3 py-1.5 text-sm">
                  <span className="h-4 w-4 rounded-full border border-ink/20" style={{ background: v.hex_color ?? "#ddd" }} />
                  {v.name}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8">
            <Link href={product ? `/product/${product.slug}` : "/shop"} className="btn btn-primary">
              {c.button_label || "View product"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export async function SectionRenderer({ sections, settings }: { sections: PageSection[]; settings: SiteSettings }) {
  if (!sections.length) {
    return (
      <div className="container-x py-32 text-center text-ink-soft">
        <p>This page has no sections yet. Add some in Admin &gt; Website.</p>
      </div>
    );
  }
  return (
    <>
      {sections.map((s) => {
        const c = (s.content ?? {}) as C;
        switch (s.type) {
          case "hero":
            return <Hero key={s.id} c={c} />;
          case "text":
            return <TextSection key={s.id} c={c} />;
          case "image":
            return <ImageSection key={s.id} c={c} />;
          case "image_text":
            return <ImageText key={s.id} c={c} />;
          case "featured_product":
            return <FeaturedProduct key={s.id} c={c} settings={settings} />;
          case "cta":
            return <CallToAction key={s.id} c={c} />;
          case "gallery":
            return <Gallery key={s.id} c={c} />;
          default:
            return null;
        }
      })}
    </>
  );
}
