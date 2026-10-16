import type { Config } from "@netlify/functions";
import { db, media, getCfg, json, adminUser, COLORS, type Cfg } from "../lib/shared.mts";

const STATUSES = ["New", "Confirmed", "Out for delivery", "Delivered", "Cancelled"];

async function listOrders() {
  const store = db();
  const { blobs } = await store.list({ prefix: "orders/" });
  const all = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
  return all.filter(Boolean).sort((a: any, b: any) => (a.date < b.date ? 1 : -1));
}

export default async (req: Request) => {
  const path = new URL(req.url).pathname.replace(/^\/api\//, "").replace(/\/$/, "");
  const m = req.method;

  // Public: the published site and the store settings customers need.
  if (path === "site" && m === "GET") {
    const site = await db().get("site", { type: "json" });
    return json({ ok: true, site, cfg: await getCfg() });
  }

  const user = await adminUser(req);
  if (!user) return json({ error: "Please log in again." }, 401);

  if (path === "site" && m === "PUT") {
    const { site } = await req.json();
    if (!site || typeof site !== "object" || !Array.isArray(site.home)) return json({ error: "Nothing to publish." }, 400);
    await db().setJSON("site", site);
    await db().setJSON("draft", site);
    return json({ ok: true });
  }
  if (path === "draft" && m === "GET") return json({ ok: true, draft: await db().get("draft", { type: "json" }) });
  if (path === "draft" && m === "PUT") {
    const { draft } = await req.json();
    if (draft === null) await db().delete("draft");
    else await db().setJSON("draft", draft);
    return json({ ok: true });
  }
  if (path === "admin" && m === "GET") {
    const { blobs } = await db().list({ prefix: "subs/" });
    return json({ ok: true, orders: await listOrders(), subs: blobs.map((b) => b.key.slice(5)), cfg: await getCfg(), email: user.email });
  }
  if (path === "cfg" && m === "PUT") {
    const b = (await req.json()) as Partial<Cfg>;
    const cur = await getCfg();
    const next: Cfg = { ...cur };
    if (b.price !== undefined) { if (!(+b.price > 0)) return json({ error: "Enter a price above 0." }, 400); next.price = +b.price; }
    if (b.delivery !== undefined) next.delivery = Math.max(0, +b.delivery || 0);
    if (b.wa !== undefined) { const w = String(b.wa).replace(/\D/g, ""); if (w.length < 10) return json({ error: "Enter the full WhatsApp number with 961." }, 400); next.wa = w; }
    if (b.colors) for (const id of COLORS) if (b.colors[id]) next.colors[id] = { stock: Math.max(0, Math.floor(+b.colors[id].stock || 0)), visible: b.colors[id].visible !== false };
    if (!Object.values(next.colors).some((c) => c.visible)) return json({ error: "Keep at least one colour visible." }, 400);
    await db().setJSON("cfg", next);
    return json({ ok: true, cfg: next });
  }
  if (path === "order-status" && m === "PATCH") {
    const { no, status } = await req.json();
    if (!STATUSES.includes(status)) return json({ error: "Unknown status." }, 400);
    const key = "orders/" + String(no).replace(/[^A-Z0-9-]/gi, "");
    const o: any = await db().get(key, { type: "json" });
    if (!o) return json({ error: "Order not found." }, 404);
    const cfg = await getCfg();
    // Cancelling returns the stock; un-cancelling takes it again.
    const sign = status === "Cancelled" && o.status !== "Cancelled" ? 1 : o.status === "Cancelled" && status !== "Cancelled" ? -1 : 0;
    if (sign) {
      for (const [id, q] of o.lines) if (cfg.colors[id]) cfg.colors[id].stock = Math.max(0, cfg.colors[id].stock + sign * q);
      await db().setJSON("cfg", cfg);
    }
    o.status = status;
    await db().setJSON(key, o);
    return json({ ok: true, order: o, cfg });
  }
  if (path === "media" && m === "GET") {
    const { blobs } = await media().list();
    return json({ ok: true, ids: blobs.map((b) => b.key) });
  }
  if (path === "media" && m === "POST") {
    const type = req.headers.get("content-type") || "";
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return json({ error: "Upload a JPEG, PNG or WebP photo." }, 400);
    const body = await req.arrayBuffer();
    if (body.byteLength > 4_000_000) return json({ error: "That photo is too large." }, 400);
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    await media().set(id, body, { metadata: { type } });
    return json({ ok: true, id });
  }
  return json({ error: "Not found." }, 404);
};

export const config: Config = { path: "/api/*", excludedPath: ["/api/order", "/api/subscribe"] };
