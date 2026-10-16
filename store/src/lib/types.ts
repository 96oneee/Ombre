export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_featured: boolean;
}

export interface SpecRow {
  label: string;
  value: string;
}

/** A purchasable colour, already priced and with its own images. */
export interface CatalogVariant {
  id: string;
  name: string;
  hex_color: string | null;
  sku: string | null;
  unit_price: number;
  compare_at: number | null;
  stock: number;
  low_stock_threshold: number;
  images: ProductImage[];
}

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  specs: SpecRow[];
  seo_title: string | null;
  seo_description: string | null;
  variants: CatalogVariant[];
  /** Images shared by all colours. */
  shared_images: ProductImage[];
  cover_path: string | null;
  price_from: number;
}

export interface DeliverySettings {
  is_enabled: boolean;
  flat_fee: number;
  free_delivery_threshold: number | null;
  notes: string | null;
}

export interface DeliveryRegion {
  id: string;
  name: string;
  fee_override: number | null;
  is_active: boolean;
  sort_order: number;
}

export interface Currency {
  code: string;
  symbol: string;
  position: "before" | "after";
}

export interface PageSection {
  id: string;
  page_id: string;
  type: string;
  content: Record<string, any>;
  is_visible: boolean;
  sort_order: number;
}
