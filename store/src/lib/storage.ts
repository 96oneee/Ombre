export const BUCKETS = {
  products: "product-images",
  site: "site-media",
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Public URL of a file in a public bucket. */
export function publicUrl(bucket: Bucket, path: string | null | undefined): string | null {
  if (!path) return null;
  // site-relative (demo / bundled) and absolute URLs are used as they are
  if (/^(\.?\/|https?:\/\/)/.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
