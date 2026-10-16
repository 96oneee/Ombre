import { DEF_CFG, COLORS, json, getCfg, isAdmin, makeToken, sameText } from "../_lib/core.js";

const STATUSES = ["New", "Confirmed", "Out for delivery", "Delivered", "Cancelled"];
const GOV = ["Beirut", "Mount Lebanon", "North", "Akkar", "Bekaa", "Baalbek-Hermel", "South", "Nabatieh"];
const clean = (v, max = 200) => String(v ?? "").trim().slice(0, max);

async function listOrders(env) {
  const keys = [];
  let cursor;
  do {
    const r = await env.DATA.list({ prefix: "orders/", cursor });
    keys.push(...r.keys.map((k) => k.name));
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  const all = await Promise.all(keys.map((k) => env.DATA.get(k, "json")));
  return all.filter(Boolean).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function onRequest({ request, env, params }) {
  if (!env.DATA) return json({ error: "The store's storage is not connected yet (KV binding DATA)." }, 500);
  const path = (params.path || []).join("/");
  const m = request.method;
  const body = async () => { try { return await request.json(); } catch { return {}; } };

  // ---- public ----
  if (path === "site" && m === "GET")
    return json({ ok: true, auth: "password", site: await env.DATA.get("site", "json"), cfg: await getCfg(env) });

  if (path === "login" && m === "POST") {
    const ip = request.headers.get("cf-connecting-ip") || "x";
    const rk = "rl/" + ip, tries = +(await env.DATA.get(rk)) || 0;
    if (tries >= 10) return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
    const { password } = await body();
    if (!env.ADMIN_PASSWORD || !sameText(String(password || ""), env.ADMIN_PASSWORD)) {
      await env.DATA.put(rk, String(tries + 1), { expirationTtl: 900 });
      return json({ error: "Wrong password." }, 401);
    }
    return json({ ok: true, token: await makeToken(env) });
  }

  if (path === "subscribe" && m === "POST") {
    const email = clean((await body()).email).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Check the email address." }, 400);
    await env.DATA.put("subs/" + email, new Date().toISOString());
    return json({ ok: true });
  }

  if (path === "order" && m === "POST") {
    const b = await body();
    const phone = clean(b.phone, 30).replace(/\D/g, "").replace(/^961/, "");
    const o = { name: clean(b.name, 120), email: clean(b.email), gov: clean(b.gov, 40), city: clean(b.city, 120), addr: clean(b.addr, 300), notes: clean(b.notes, 500) };
    if (o.name.length < 2) return json({ error: "Enter your full name." }, 400);
    if (!/^(3\d{6}|(70|71|76|78|79|81)\d{6})$/.test(phone)) return json({ error: "Enter a Lebanese mobile number, for example 71 123 456." }, 400);
    if (!GOV.includes(o.gov)) return json({ error: "Select your governorate." }, 400);
    if (o.city.length < 2 || o.addr.length < 4) return json({ error: "Add your city, street and building." }, 400);
    const lines = (Array.isArray(b.lines) ? b.lines : [])
      .map(([id, q]) => [String(id), Math.floor(+q)])
      .filter(([id, q]) => COLORS.includes(id) && q > 0 && q <= 20);
    if (!lines.length) return json({ error: "Your cart is empty." }, 400);
    const cfg = await getCfg(env);
    for (const [id, q] of lines) {
      const c = cfg.colors[id];
      if (!c || c.visible === false || c.stock < q) return json({ error: `Only ${c ? c.stock : 0} Ombre ${id === "beige" ? "Beige" : "Blue"} left in stock.`, cfg }, 409);
    }
    for (const [id, q] of lines) cfg.colors[id].stock -= q;
    await env.DATA.put("cfg", JSON.stringify(cfg));
    const no = "OM-" + Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
    const units = lines.reduce((s, [, q]) => s + q, 0);
    const order = { no, date: new Date().toISOString(), status: "New", ...o, phone: phone.replace(/^(\d{1,2})(\d{3})(\d{3})$/, "$1 $2 $3"), lines, price: cfg.price, delivery: cfg.delivery, total: units * cfg.price + cfg.delivery };
    await env.DATA.put("orders/" + no, JSON.stringify(order));
    return json({ ok: true, order, cfg });
  }

  // ---- admin only ----
  if (!(await isAdmin(request, env))) return json({ error: "Please log in again." }, 401);

  if (path === "site" && m === "PUT") {
    const { site } = await body();
    if (!site || !Array.isArray(site.home)) return json({ error: "Nothing to publish." }, 400);
    await env.DATA.put("site", JSON.stringify(site));
    await env.DATA.put("draft", JSON.stringify(site));
    return json({ ok: true });
  }
  if (path === "draft" && m === "GET") return json({ ok: true, draft: await env.DATA.get("draft", "json") });
  if (path === "draft" && m === "PUT") {
    const { draft } = await body();
    if (draft === null) await env.DATA.delete("draft");
    else await env.DATA.put("draft", JSON.stringify(draft));
    return json({ ok: true });
  }
  if (path === "admin" && m === "GET") {
    const subs = await env.DATA.list({ prefix: "subs/" });
    return json({ ok: true, orders: await listOrders(env), subs: subs.keys.map((k) => k.name.slice(5)), cfg: await getCfg(env) });
  }
  if (path === "cfg" && m === "PUT") {
    const b = await body(), next = await getCfg(env);
    if (b.price !== undefined) { if (!(+b.price > 0)) return json({ error: "Enter a price above 0." }, 400); next.price = +b.price; }
    if (b.delivery !== undefined) next.delivery = Math.max(0, +b.delivery || 0);
    if (b.wa !== undefined) { const w = String(b.wa).replace(/\D/g, ""); if (w.length < 10) return json({ error: "Enter the full WhatsApp number with 961." }, 400); next.wa = w; }
    if (b.colors) for (const id of COLORS) if (b.colors[id]) next.colors[id] = { stock: Math.max(0, Math.floor(+b.colors[id].stock || 0)), visible: b.colors[id].visible !== false };
    if (!Object.values(next.colors).some((c) => c.visible)) return json({ error: "Keep at least one colour visible." }, 400);
    await env.DATA.put("cfg", JSON.stringify(next));
    return json({ ok: true, cfg: next });
  }
  if (path === "order-status" && m === "PATCH") {
    const { no, status } = await body();
    if (!STATUSES.includes(status)) return json({ error: "Unknown status." }, 400);
    const key = "orders/" + String(no).replace(/[^A-Z0-9-]/gi, "");
    const o = await env.DATA.get(key, "json");
    if (!o) return json({ error: "Order not found." }, 404);
    const cfg = await getCfg(env);
    const sign = status === "Cancelled" && o.status !== "Cancelled" ? 1 : o.status === "Cancelled" && status !== "Cancelled" ? -1 : 0;
    if (sign) {
      for (const [id, q] of o.lines) if (cfg.colors[id]) cfg.colors[id].stock = Math.max(0, cfg.colors[id].stock + sign * q);
      await env.DATA.put("cfg", JSON.stringify(cfg));
    }
    o.status = status;
    await env.DATA.put(key, JSON.stringify(o));
    return json({ ok: true, order: o, cfg });
  }
  if (path === "media" && m === "GET") {
    const r = await env.DATA.list({ prefix: "media/" });
    return json({ ok: true, ids: r.keys.map((k) => k.name.slice(6)) });
  }
  if (path === "media" && m === "POST") {
    const type = request.headers.get("content-type") || "";
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return json({ error: "Upload a JPEG, PNG or WebP photo." }, 400);
    const buf = await request.arrayBuffer();
    if (buf.byteLength > 4_000_000) return json({ error: "That photo is too large." }, 400);
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    await env.DATA.put("media/" + id, buf, { metadata: { type } });
    return json({ ok: true, id });
  }
  return json({ error: "Not found." }, 404);
}
