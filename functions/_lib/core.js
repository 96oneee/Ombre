// Cloudflare Pages Functions backend for the Ombre store.
// Data lives in one KV namespace bound as DATA: the published site, the editor
// draft, store settings, orders, subscribers and uploaded photos.
// The admin password is the ADMIN_PASSWORD environment variable (a secret).

export const DEF_CFG = {
  price: 80,
  delivery: 5,
  wa: "96171964944",
  colors: { beige: { stock: 50, visible: true }, blue: { stock: 50, visible: true } },
};
export const COLORS = ["beige", "blue"];

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function getCfg(env) {
  const c = (await env.DATA.get("cfg", "json")) || {};
  return { ...DEF_CFG, ...c, colors: { ...DEF_CFG.colors, ...(c.colors || {}) } };
}

const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const secret = (env) => env.SESSION_SECRET || "ombre-session:" + (env.ADMIN_PASSWORD || "");
async function hmac(env, text) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
}
export function sameText(a, b) {
  const x = enc.encode(a), y = enc.encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}
// A login token is "<expiry>.<signature>", valid for 30 days.
export async function makeToken(env) {
  const exp = String(Math.floor(Date.now() / 1000) + 30 * 86400);
  return exp + "." + (await hmac(env, exp));
}
export async function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const a = request.headers.get("authorization") || "";
  const t = a.startsWith("Bearer ") ? a.slice(7) : "";
  const [exp, sig] = t.split(".");
  if (!exp || !sig || +exp < Date.now() / 1000) return false;
  return sameText(sig, await hmac(env, exp));
}
