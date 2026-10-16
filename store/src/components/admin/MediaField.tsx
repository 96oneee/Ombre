"use client";
import { useRef, useState } from "react";
import { registerMedia } from "@/app/admin/(dashboard)/website/actions";
import { BUCKETS, publicUrl } from "@/lib/storage";
import { uploadFile } from "@/lib/upload";

async function uploadToLibrary(file: File, folder: string): Promise<string> {
  const up = await uploadFile(BUCKETS.site, folder, file);
  const res = await registerMedia(up.path, file.name, up.mime, up.size);
  if (!res.ok) throw new Error(res.error);
  return up.path;
}

/** Upload (or remove) one image or video stored in the site-media bucket. */
export function MediaField({ value, onChange, kind = "image", folder = "sections" }: { value: string; onChange: (path: string) => void; kind?: "image" | "video"; folder?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = publicUrl(BUCKETS.site, value);

  async function pick(files: FileList | null) {
    if (!files?.[0]) return;
    setBusy(true);
    setError("");
    try {
      onChange(await uploadToLibrary(files[0], folder));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      {url ? (
        kind === "video" ? (
          <video src={url} className="mb-2 h-32 rounded-lg bg-black" muted controls />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="mb-2 h-32 rounded-lg object-cover" />
        )
      ) : (
        <p className="mb-2 text-sm text-neutral-500">{kind === "video" ? "No video." : "No image."}</p>
      )}
      <input ref={input} type="file" className="hidden" accept={kind === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml"} onChange={(e) => pick(e.target.files)} />
      <div className="flex gap-2">
        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Uploading…" : value ? "Replace" : "Upload"}</button>
        {value && <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => onChange("")}>Remove</button>}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

/** Same as MediaField but works inside a normal <form>: submits the path as a hidden input. */
export function MediaInput({ name, defaultValue = "", kind = "image", folder = "brand" }: { name: string; defaultValue?: string; kind?: "image" | "video"; folder?: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <MediaField value={value} onChange={setValue} kind={kind} folder={folder} />
    </>
  );
}

/** A list of images (gallery). */
export function MediaListField({ value, onChange }: { value: string[]; onChange: (paths: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      const added: string[] = [];
      for (const f of Array.from(files)) added.push(await uploadToLibrary(f, "sections"));
      onChange([...value, ...added]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((p, i) => (
            <li key={p} className="rounded-lg border border-neutral-200 p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicUrl(BUCKETS.site, p) ?? ""} alt="" className="aspect-square w-full rounded object-cover" />
              <div className="mt-1 flex gap-1">
                <button type="button" className="btn btn-outline btn-sm !min-h-[28px] !px-2" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier">←</button>
                <button type="button" className="btn btn-outline btn-sm !min-h-[28px] !px-2" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Move later">→</button>
                <button type="button" className="btn btn-danger btn-sm !min-h-[28px] !px-2" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label="Remove">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <input ref={input} type="file" multiple className="hidden" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={(e) => add(e.target.files)} />
      <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Uploading…" : "Add images"}</button>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
