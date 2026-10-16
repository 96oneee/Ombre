import type { Config } from "@netlify/functions";
import { db, getCfg, json, COLORS } from "../lib/shared.mts";

const GOV = ["Beirut", "Mount Lebanon", "North", "Akkar", "Bekaa", "Baalbek-Hermel", "South", "Nabatieh"];
const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

// Public endpoints customers use: placing an order and signing up for emails.
export default async (req: Request) => {
  const path = new URL(req.url).pathname;
  let b: any;
  try { b = await req.json(); } catch { return json({ error: "Something went wrong. Please try again." }, 400); }

  if (path === "/api/subscribe") {
    const email = clean(b.email, 200).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Check the email address." }, 400);
    await db().set("subs/" + email, new Date().toISOString());
    return json({ ok: true });
  }

  // Place an order. Prices and stock come from the server, never the browser.
  const phone = clean(b.phone, 30).replace(/\D/g, "").replace(/^961/, "");
  const order = { name: clean(b.name, 120), email: clean(b.email, 200), gov: clean(b.gov, 40), city: clean(b.city, 120), addr: clean(b.addr, 300), notes: clean(b.notes, 500) };
  if (order.name.length < 2) return json({ error: "Enter your full name." }, 400);
  if (!/^(3\d{6}|(70|71|76|78|79|81)\d{6})$/.test(phone)) return json({ error: "Enter a Lebanese mobile number, for example 71 123 456." }, 400);
  if (!GOV.includes(order.gov)) return json({ error: "Select your governorate." }, 400);
  if (order.city.length < 2 || order.addr.length < 4) return json({ error: "Add your city, street and building." }, 400);
  const lines: [string, number][] = (Array.isArray(b.lines) ? b.lines : [])
    .map(([id, q]: [string, number]) => [String(id), Math.floor(+q)] as [string, number])
    .filter(([id, q]: [string, number]) => (COLORS as readonly string[]).includes(id) && q > 0 && q <= 20);
  if (!lines.length) return json({ error: "Your cart is empty." }, 400);

  const cfg = await getCfg();
  for (const [id, q] of lines) {
    const c = cfg.colors[id];
    if (!c || c.visible === false || c.stock < q) return json({ error: `Only ${c ? c.stock : 0} Ombre ${id === "beige" ? "Beige" : "Blue"} left in stock.`, cfg }, 409);
  }
  for (const [id, q] of lines) cfg.colors[id].stock -= q;
  await db().setJSON("cfg", cfg);

  const no = "OM-" + Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  const units = lines.reduce((s, [, q]) => s + q, 0);
  const full = {
    no, date: new Date().toISOString(), status: "New", ...order,
    phone: phone.replace(/^(\d{1,2})(\d{3})(\d{3})$/, "$1 $2 $3"),
    lines, price: cfg.price, delivery: cfg.delivery, total: units * cfg.price + cfg.delivery,
  };
  await db().setJSON("orders/" + no, full);
  return json({ ok: true, order: full, cfg });
};

export const config: Config = {
  path: ["/api/order", "/api/subscribe"],
  method: "POST",
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
