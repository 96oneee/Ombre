// The admin's AI assistant. It reads the editor draft and returns a short reply
// plus a list of edits ("ops") that the editor applies to the draft, so nothing
// goes live until the owner presses Publish. Price, delivery fee, WhatsApp
// number and stock changes come back as "cfg" and need the owner's confirmation.
//
// Provider: Claude when the ANTHROPIC_API_KEY secret is set (best results),
// otherwise Cloudflare Workers AI through a binding named AI (free daily allowance).

const OPS_HELP = `Edits you can return in "ops" (applied in order):
- {"op":"set","path":"...","value":...}  Change one value. Paths use dots. Home sections are addressed by their id, e.g. "home.hero.s.title", "home.faq.items.2.a", "theme.accent", "global.ticker.0", "global.menu.1.label", "product.subtitle", "productSpecs.0.v", "about.title", "aboutPillars.1.text", "shop.text".
- {"op":"add_item","path":"<list path>","value":{...}}  Append to a list, e.g. path "home.faq.items" value {"q":"...","a":"..."}, or path "global.ticker" value "New message".
- {"op":"remove_item","path":"<list path>","index":2}
- {"op":"add_section","type":"<section type>","after":"<section id or start or end>","s":{...},"items":[...]}
- {"op":"remove_section","id":"<section id>"}
- {"op":"move_section","id":"<section id>","index":0}
- {"op":"hide_section","id":"<section id>","hidden":true}
Store settings (price, delivery fee, WhatsApp number, stock, colour visibility) are NOT ops. Put them in "cfg", e.g. {"price":90} or {"colors":{"blue":{"stock":20,"visible":true}}}. The owner confirms them before they go live.`;

const RULES = `You are the AI assistant inside the admin of Ombre, a small online store in Lebanon that sells one product: a square folding beach shade (50 x 50 cm, wooden folding frame) in Beige and Blue, paid cash on delivery.
The owner talks to you to change their store. Do what they ask by returning edits. Your edits go into the editor draft and show in the preview; the owner reviews them and presses Publish to make them live.
Rules:
- Reply in the owner's language (English, French, Arabic or Lebanese Arabic), in one to three short, friendly sentences saying what you changed or answering the question. Do not paste JSON or paths in the reply.
- Only change what was asked. Keep the store's calm, simple voice. Use plain words, no hype.
- In text, *word* makes italics, and {price}, {fee} and {whatsapp} fill in automatically. Keep those placeholders where they are useful.
- Never invent facts about the product, customer reviews, discounts or delivery promises. If the owner asks for something that needs facts you do not have, ask them.
- Images: use only paths from the image list.
- Colours are hex like #227b92. Fonts must come from the font lists.
- If the request is unclear, ask one short question and return no ops.
- If they ask about orders or sales, explain that you can only see and change the store's content and settings, and point them to the Orders page.`;

export const AI_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    ops: {
      type: "array",
      items: {
        type: "object",
        properties: {
          op: { type: "string", enum: ["set", "add_item", "remove_item", "add_section", "remove_section", "move_section", "hide_section"] },
          path: { type: "string" },
          value: {},
          index: { type: "integer" },
          id: { type: "string" },
          type: { type: "string" },
          after: { type: "string" },
          hidden: { type: "boolean" },
          s: { type: "object" },
          items: { type: "array" },
        },
        required: ["op"],
      },
    },
    cfg: {
      type: "object",
      properties: {
        price: { type: "number" },
        delivery: { type: "number" },
        wa: { type: "string" },
        colors: { type: "object" },
      },
    },
  },
  required: ["reply", "ops"],
};

const cut = (v, n) => String(v ?? "").slice(0, n);

export function buildSystem(ctx) {
  return `${RULES}

${OPS_HELP}

Section types for the home page (fields in "s", list items in "items"):
${cut(ctx.schema, 6000)}

Fonts for headings: ${cut(ctx.fonts?.display, 400)}
Fonts for body text: ${cut(ctx.fonts?.body, 400)}
Images you can use: ${cut(ctx.images, 2000)}
Link values for buttons: home, product, shop, about, faq

The owner is looking at the "${cut(ctx.page, 20)}" page in the editor.

Current store settings (live now): ${cut(JSON.stringify(ctx.cfg || {}), 1000)}

Current draft of the store content:
${cut(JSON.stringify(ctx.draft || {}), 30000)}`;
}

function cleanMessages(list) {
  const msgs = (Array.isArray(list) ? list : [])
    .slice(-12)
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: cut(m.content, 4000) }))
    .filter((m) => m.content.trim());
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs;
}

function parseLoose(x) {
  if (x && typeof x === "object") return x;
  const s = String(x || "");
  try { return JSON.parse(s); } catch {}
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
  return { reply: s.trim() || "Sorry, I didn't get that. Could you say it another way?", ops: [] };
}

function normalise(out) {
  const o = parseLoose(out);
  return {
    reply: cut(o.reply, 2000) || "Done.",
    ops: Array.isArray(o.ops) ? o.ops.slice(0, 60) : [],
    cfg: o.cfg && typeof o.cfg === "object" && Object.keys(o.cfg).length ? o.cfg : null,
  };
}

async function viaClaude(env, system, messages) {
  const base = env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  const r = await fetch(base + "/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: env.AI_MODEL || "claude-sonnet-5-5",
      max_tokens: 4096,
      system,
      messages,
      tools: [{ name: "edit_store", description: "Reply to the owner and return the edits to make.", input_schema: AI_SCHEMA }],
      tool_choice: { type: "tool", name: "edit_store" },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || "The AI service returned an error (" + r.status + ").");
  const block = (j.content || []).find((c) => c.type === "tool_use");
  if (block) return block.input;
  return (j.content || []).map((c) => c.text || "").join("");
}

async function viaWorkersAI(env, system, messages) {
  const model = env.AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const input = {
    messages: [{ role: "system", content: system + '\n\nAnswer with one JSON object only: {"reply": "...", "ops": [...], "cfg": {...} or null}.' }, ...messages],
    max_tokens: 2048,
    temperature: 0.2,
  };
  let r;
  try {
    r = await env.AI.run(model, { ...input, response_format: { type: "json_schema", json_schema: AI_SCHEMA } });
  } catch {
    r = await env.AI.run(model, input); // some models don't support JSON mode
  }
  return r && r.response !== undefined ? r.response : r;
}

export async function askAI(env, body) {
  const messages = cleanMessages(body.messages);
  if (!messages.length) throw new Error("Type what you'd like to change.");
  const system = buildSystem(body);
  if (env.ANTHROPIC_API_KEY) return normalise(await viaClaude(env, system, messages));
  if (env.AI) return normalise(await viaWorkersAI(env, system, messages));
  const e = new Error("The AI assistant isn't switched on yet. In Cloudflare, open your project's Settings → Bindings → Add → Workers AI, name it AI, then redeploy.");
  e.status = 503;
  throw e;
}
