import Image from "next/image";
import Link from "next/link";
import type { HomeContent } from "@/lib/home";
import { Em, plain } from "./Em";

/** Chapter 5 · Effortless shopping: how ordering works, then one last picture and a way to the shop. */
export function Shopping({ c, fee, productHref }: { c: HomeContent["shopping"]; fee: string; productHref: string }) {
  const fill = (t: string) => t.replaceAll("{fee}", fee);
  return (
    <>
      <section className="py-24 md:py-40" aria-labelledby="shopping-title">
        <div className="container-x">
          <p className="eyebrow">{c.eyebrow}</p>
          <h2 id="shopping-title" className="mt-4 font-display text-[44px] font-light leading-none md:text-[80px]">
            <Em text={c.title} />
          </h2>
          <ol className="mt-14 grid gap-px bg-charcoal/15 md:mt-20 md:grid-cols-3">
            {c.steps.map((s, k) => (
              <li key={s.title + k} className="bg-sand py-8 md:px-8 md:py-10 md:first:pl-0">
                <span className="font-display text-[22px] italic text-wood">{String(k + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 font-display text-[30px] leading-tight md:text-[36px]">{fill(s.title)}</h3>
                <p className="mt-3 max-w-[32ch] text-[15px] leading-relaxed text-mist">{fill(s.text)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="grid bg-sea text-shell md:grid-cols-2" aria-label={plain(c.bandTitle)}>
        <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[78vh]">
          <Image src={c.bandImage} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </div>
        <div className="flex flex-col justify-center px-4 py-20 md:px-16">
          <p className="font-display text-[56px] font-light leading-[0.95] md:text-[104px]">
            <Em text={c.bandTitle} />
          </p>
          <Link href={productHref} className="btn btn-ghost-light mt-10 self-start">
            {c.bandCta}
          </Link>
        </div>
      </section>
    </>
  );
}
