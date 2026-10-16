import type { Config } from "@netlify/functions";
import { media } from "../lib/shared.mts";

// Serves photos uploaded from the site editor.
export default async (req: Request) => {
  const id = decodeURIComponent(new URL(req.url).pathname.split("/").pop() || "");
  if (!/^[a-z0-9]{6,40}$/.test(id)) return new Response("Not found", { status: 404 });
  const r = await media().getWithMetadata(id, { type: "arrayBuffer" });
  if (!r) return new Response("Not found", { status: 404 });
  return new Response(r.data, { headers: { "content-type": String(r.metadata.type || "image/jpeg"), "cache-control": "public, max-age=31536000, immutable" } });
};

export const config: Config = { path: "/media/:id" };
