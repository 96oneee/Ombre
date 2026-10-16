"use client";
import { createClient } from "@/lib/supabase/client";
import type { Bucket } from "./storage";

const MAX_IMAGE_MB = 8;
const MAX_VIDEO_MB = 50;

/** Uploads straight to Supabase Storage using the admin's own session (Storage policies enforce admin-only). */
export async function uploadFile(bucket: Bucket, folder: string, file: File): Promise<{ path: string; size: number; mime: string }> {
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isImage && !(isVideo && bucket === "site-media")) {
    throw new Error(`"${file.name}" is not a supported file type.`);
  }
  const limit = (isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB) * 1024 * 1024;
  if (file.size > limit) {
    throw new Error(`"${file.name}" is too large (max ${isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB} MB).`);
  }
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return { path, size: file.size, mime: file.type };
}
