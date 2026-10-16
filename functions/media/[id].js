// Serves photos uploaded from the site editor.
export async function onRequestGet({ params, env }) {
  const id = String(params.id || "");
  if (!env.DATA || !/^[a-z0-9]{6,40}$/.test(id)) return new Response("Not found", { status: 404 });
  const r = await env.DATA.getWithMetadata("media/" + id, "arrayBuffer");
  if (!r.value) return new Response("Not found", { status: 404 });
  return new Response(r.value, { headers: { "content-type": (r.metadata && r.metadata.type) || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
}
