import type { Metadata } from "next";
import { ChooseShade } from "@/components/home/ChooseShade";
import { Discovery } from "@/components/home/Discovery";
import { Entrance } from "@/components/home/Entrance";
import { EntranceSun } from "@/components/home/EntranceSun";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Shopping } from "@/components/home/Shopping";
import { getHome } from "@/lib/home";
import { formatMoney } from "@/lib/pricing";
import { currencyOf } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const { settings, product } = await getHome();
  return {
    title: { absolute: `${settings.brand_name} · The Art of Shade` },
    description: product?.short_description ?? settings.footer_text ?? undefined,
  };
}

export default async function HomePage() {
  const { content, settings, product, delivery } = await getHome();
  const currency = currencyOf(settings);
  // the fly-through into the shade uses the Blue variant's colour, else the brand sea
  const fabric = product?.variants.find((v) => v.name.toLowerCase() === "blue")?.hex_color ?? product?.variants[0]?.hex_color ?? "#0E3A48";
  const productHref = product ? `/product/${product.slug}` : "/shop";

  return (
    <>
      {content.intro.style === "sun" ? (
        <EntranceSun intro={content.intro} hero={content.hero} />
      ) : (
        <Entrance intro={content.intro} hero={content.hero} fabric={fabric} />
      )}
      <Discovery c={content.discovery} />
      <ChooseShade c={content.shade} product={product} currency={currency} />
      <HowItWorks c={content.how} />
      <Shopping c={content.shopping} fee={formatMoney(delivery.flat_fee, currency)} productHref={productHref} />
    </>
  );
}
