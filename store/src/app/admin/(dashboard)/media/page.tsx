import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { CopyButton } from "@/components/admin/CopyButton";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { Flash, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { BUCKETS, publicUrl } from "@/lib/storage";
import { formatDate } from "@/lib/utils";
import { deleteMedia } from "./actions";

export const metadata = { title: "Media" };

export default async function MediaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: files } = await supabase.from("media").select("*").eq("bucket", BUCKETS.site).order("created_at", { ascending: false }).limit(200);

  return (
    <>
      <PageHeader title="Media library" />
      <Flash ok={sp.ok} error={sp.error} />
      <p className="mb-4 max-w-2xl text-sm text-neutral-600">Files used by website sections and the logo. Product photos are managed on each product&apos;s page. You can upload files here, or directly inside a section or in Settings.</p>
      <div className="mb-8"><MediaUploader /></div>

      {(files ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-neutral-500">No files yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(files ?? []).map((f) => {
            const url = publicUrl(BUCKETS.site, f.path) ?? "";
            const isVideo = (f.mime_type ?? "").startsWith("video/");
            return (
              <li key={f.id} className="rounded-xl border border-neutral-200 bg-white p-2">
                {isVideo ? <video src={url} className="aspect-square w-full rounded-lg bg-black object-cover" muted /> : <img src={url} alt={f.alt_text ?? ""} className="aspect-square w-full rounded-lg object-cover" loading="lazy" />}
                <p className="mt-2 truncate px-1 text-xs" title={f.filename ?? f.path}>{f.filename ?? f.path}</p>
                <p className="px-1 text-xs text-neutral-500">{formatDate(f.created_at)}{f.size_bytes ? ` · ${(Number(f.size_bytes) / 1024 / 1024).toFixed(1)} MB` : ""}</p>
                <div className="mt-2 flex gap-1 px-1 pb-1">
                  <CopyButton text={url} />
                  <form action={deleteMedia.bind(null, f.id)}><ConfirmButton message="Delete this file?" className="btn btn-danger btn-sm !min-h-[30px] !px-2">Delete</ConfirmButton></form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
