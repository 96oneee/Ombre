import type { SiteSettings } from "./settings";
import type { CatalogProduct, CatalogVariant, DeliveryRegion, DeliverySettings, ProductImage } from "./types";

/**
 * Preview data, used only when Supabase is not configured.
 * Every value here is a confirmed OMBRE fact from the live store (price, delivery, colours, size, contacts).
 * Once the database is connected, the admin is the source of truth and this file is ignored.
 */

export const DEMO_SETTINGS: SiteSettings = {
  brand_name: "OMBRE",
  logo_path: "",
  contact_email: "",
  contact_phone: "+961 71 964 944",
  whatsapp_number: "+961 71 964 944",
  instagram_url: "https://www.instagram.com/weareombre/",
  address: "",
  footer_text: "A square folding shade, delivered anywhere in Lebanon. Pay in cash when it arrives.",
  copyright_text: "OMBRE",
  announcement_enabled: true,
  announcement_text: "Cash on delivery across Lebanon · $5 delivery",
  currency_code: "USD",
  currency_symbol: "$",
  currency_position: "before",
  site_url: "",
  site_language: "en",
};

export const DEMO_DELIVERY: { settings: DeliverySettings; regions: DeliveryRegion[] } = {
  settings: { is_enabled: true, flat_fee: 5, free_delivery_threshold: null, notes: "Anywhere in Lebanon" },
  regions: [],
};

function img(id: string, path: string, variant: string | null, alt: string, sort: number): ProductImage {
  return { id, product_id: "demo-ombre", variant_id: variant, storage_path: path, alt_text: alt, sort_order: sort, is_featured: sort === 0 } as ProductImage;
}

const variant = (id: string, name: string, hex: string, images: ProductImage[]): CatalogVariant => ({
  id,
  name,
  hex_color: hex,
  sku: null,
  unit_price: 80,
  compare_at: null,
  stock: 99,
  low_stock_threshold: 5,
  images,
});

export const DEMO_PRODUCT: CatalogProduct = {
  id: "demo-ombre",
  slug: "ombre",
  name: "Ombre",
  short_description: "Square folding beach shade, 50 × 50 cm",
  description: null,
  specs: [
    { label: "Shape", value: "Square" },
    { label: "Size", value: "50 × 50 cm" },
    { label: "Frame", value: "Folding, wood" },
    { label: "Colours", value: "Beige, Blue" },
  ],
  seo_title: null,
  seo_description: null,
  variants: [
    variant("demo-beige", "Beige", "#E8DFD1", [
      img("b1", "/img/beige.jpg", "demo-beige", "Ombre in Beige", 0),
      img("b2", "/img/beige-detail.jpg", "demo-beige", "Ombre Beige, frame detail", 1),
    ]),
    variant("demo-blue", "Blue", "#2AA7CC", [
      img("u1", "/img/blue.jpg", "demo-blue", "Ombre in Blue", 0),
      img("u2", "/img/blue-detail.jpg", "demo-blue", "Ombre Blue, frame detail", 1),
    ]),
  ],
  shared_images: [img("s1", "/img/inuse.jpg", null, "Two Ombres on the sand", 0)],
  cover_path: "/img/blue.jpg",
  price_from: 80,
};
