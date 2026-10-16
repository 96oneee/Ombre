"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { registerMedia } from "@/app/admin/(dashboard)/website/actions";
import { BUCKETS } from "@/lib/storage";
import { uploadFile } from "@/lib/upload";

export function MediaUploader() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      for (const f of Array.from(files)) {
        const up = await uploadFile(BUCKETS.site, "library", f);
        const r = await registerMedia(up.path, f.name, up.mime, up.size);
        if (!r.ok) throw new Error(r.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
      startTransition(() => router.refresh());
    }
  }

  return (
    <div>
      <input ref={input} type="file" multiple className="hidden" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml,video/mp4,video/webm" onChange={(e) => upload(e.target.files)} />
      <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Uploading…" : "Upload files"}</button>
      <span className="ml-3 text-xs text-neutral-500">Images up to 8 MB, videos (MP4/WebM) up to 50 MB.</span>
      {error && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    </div>
  );
}
