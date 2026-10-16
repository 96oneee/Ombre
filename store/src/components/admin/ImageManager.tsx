"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  deleteProductImage,
  moveProductImage,
  registerProductImages,
  replaceProductImage,
  setFeaturedImage,
  updateImageAlt,
} from "@/app/admin/(dashboard)/products/actions";
import { uploadFile } from "@/lib/upload";
import { BUCKETS } from "@/lib/storage";
import { cn } from "@/lib/utils";

export interface ManagedImage {
  id: string;
  url: string;
  alt_text: string | null;
  is_featured: boolean;
}

/** Upload, reorder, feature, replace and delete the photos of one scope (a colour, or "shared"). */
export function ImageManager({ productId, variantId, images, emptyHint }: { productId: string; variantId: string | null; images: ManagedImage[]; emptyHint: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const folder = `${productId}/${variantId ?? "shared"}`;
  const working = busy || pending;

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    const res = await fn();
    if (!res.ok) setError(res.error ?? "Something went wrong.");
    startTransition(() => router.refresh());
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      const paths: string[] = [];
      for (const f of Array.from(files)) paths.push((await uploadFile(BUCKETS.products, folder, f)).path);
      await run(() => registerProductImages(productId, variantId, paths));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function onReplace(files: FileList | null) {
    const id = replaceTarget.current;
    if (!files?.[0] || !id) return;
    setBusy(true);
    setError("");
    try {
      const { path } = await uploadFile(BUCKETS.products, folder, files[0]);
      await run(() => replaceProductImage(id, path));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      replaceTarget.current = null;
      if (replaceInput.current) replaceInput.current.value = "";
    }
  }

  return (
    <div>
      {error && <p role="alert" className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {images.length === 0 ? (
        <p className="mb-3 rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">{emptyHint}</p>
      ) : (
        <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.id} className={cn("rounded-lg border bg-white p-2", img.is_featured ? "border-lagoon" : "border-neutral-200")}>
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt_text ?? ""} className="aspect-[4/5] w-full rounded object-cover" />
                {img.is_featured && <span className="badge absolute left-1.5 top-1.5 bg-lagoon text-white">Main</span>}
              </div>
              <input
                aria-label="Image description"
                placeholder="Description (alt text)"
                defaultValue={img.alt_text ?? ""}
                className="input mt-2 min-h-[34px] px-2 py-1 text-xs"
                onBlur={(e) => e.target.value !== (img.alt_text ?? "") && run(() => updateImageAlt(img.id, e.target.value))}
              />
              <div className="mt-2 flex flex-wrap gap-1 text-xs">
                <button type="button" className="btn btn-outline btn-sm !min-h-[30px] !px-2" disabled={working || i === 0} onClick={() => run(() => moveProductImage(img.id, "up"))} aria-label="Move earlier">←</button>
                <button type="button" className="btn btn-outline btn-sm !min-h-[30px] !px-2" disabled={working || i === images.length - 1} onClick={() => run(() => moveProductImage(img.id, "down"))} aria-label="Move later">→</button>
                <button type="button" className="btn btn-outline btn-sm !min-h-[30px] !px-2" disabled={working || img.is_featured} onClick={() => run(() => setFeaturedImage(img.id))}>Set main</button>
                <button type="button" className="btn btn-outline btn-sm !min-h-[30px] !px-2" disabled={working} onClick={() => { replaceTarget.current = img.id; replaceInput.current?.click(); }}>Replace</button>
                <button type="button" className="btn btn-danger btn-sm !min-h-[30px] !px-2" disabled={working} onClick={() => confirm("Delete this image?") && run(() => deleteProductImage(img.id))}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input ref={replaceInput} type="file" accept="image/*" className="hidden" onChange={(e) => onReplace(e.target.files)} />
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
      <button type="button" className="btn btn-outline btn-sm" disabled={working} onClick={() => fileInput.current?.click()}>
        {busy ? "Uploading…" : "Upload images"}
      </button>
      <span className="ml-3 text-xs text-neutral-500">JPG, PNG, WebP or AVIF, up to 8 MB each. The first image is the main one.</span>
    </div>
  );
}
