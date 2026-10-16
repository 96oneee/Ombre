import { getStore } from "@netlify/blobs";

// One site-wide store holds everything: the published site, the editor draft,
// the store settings (price, delivery, stock), orders, subscribers and photos.
export const db = () => getStore({ name: "ombre", consistency: "strong" });
export const media = () => getStore({ name: "ombre-media", consistency: "strong" });

export const COLORS = ["beige", "blue"] as const;
export const DEF_CFG = {
  price: 80,
  delivery: 5,
  wa: "96171964944",
  colors: { beige: { stock: 50, visible: true }, blue: { stock: 50, visible: true } } as Record<string, { stock: number; visible: boolean }>,
};
export type Cfg = typeof DEF_CFG;

export async function getCfg(): Promise<Cfg> {
  const c = (await db().get("cfg", { type: "json" })) as Partial<Cfg> | null;
  return { ...DEF_CFG, ...(c || {}), colors: { ...DEF_CFG.colors, ...((c && c.colors) || {}) } };
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// The admin logs in with Netlify Identity (invite only). The browser sends the
// Identity access token; Identity itself confirms it and returns the user.
export async function adminUser(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  // IDENTITY_ORIGIN is only for local testing; on Netlify the site itself answers.
  const r = await fetch(new URL("/.netlify/identity/user", Netlify.env.get("IDENTITY_ORIGIN") || req.url), { headers: { authorization: auth } });
  if (!r.ok) return null;
  return (await r.json()) as { id: string; email: string };
}
