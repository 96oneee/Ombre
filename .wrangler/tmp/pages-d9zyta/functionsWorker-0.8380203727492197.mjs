var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/bundle-7pyXPO/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// media/[id].js
async function onRequestGet({ params, env }) {
  const id = String(params.id || "");
  if (!env.DATA || !/^[a-z0-9]{6,40}$/.test(id))
    return new Response("Not found", { status: 404 });
  const r = await env.DATA.getWithMetadata("media/" + id, "arrayBuffer");
  if (!r.value)
    return new Response("Not found", { status: 404 });
  return new Response(r.value, { headers: { "content-type": r.metadata && r.metadata.type || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
}
__name(onRequestGet, "onRequestGet");

// _lib/core.js
var DEF_CFG = {
  price: 80,
  delivery: 5,
  wa: "96171964944",
  colors: { beige: { stock: 50, visible: true }, blue: { stock: 50, visible: true } }
};
var COLORS = ["beige", "blue"];
var json = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } }), "json");
async function getCfg(env) {
  const c = await env.DATA.get("cfg", "json") || {};
  return { ...DEF_CFG, ...c, colors: { ...DEF_CFG.colors, ...c.colors || {} } };
}
__name(getCfg, "getCfg");
var enc = new TextEncoder();
var b64u = /* @__PURE__ */ __name((buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), "b64u");
var secret = /* @__PURE__ */ __name((env) => env.SESSION_SECRET || "ombre-session:" + (env.ADMIN_PASSWORD || ""), "secret");
async function hmac(env, text) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
}
__name(hmac, "hmac");
function sameText(a, b) {
  const x = enc.encode(a), y = enc.encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++)
    d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}
__name(sameText, "sameText");
async function makeToken(env) {
  const exp = String(Math.floor(Date.now() / 1e3) + 30 * 86400);
  return exp + "." + await hmac(env, exp);
}
__name(makeToken, "makeToken");
async function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD)
    return false;
  const a = request.headers.get("authorization") || "";
  const t = a.startsWith("Bearer ") ? a.slice(7) : "";
  const [exp, sig] = t.split(".");
  if (!exp || !sig || +exp < Date.now() / 1e3)
    return false;
  return sameText(sig, await hmac(env, exp));
}
__name(isAdmin, "isAdmin");

// api/[[path]].js
var STATUSES = ["New", "Confirmed", "Out for delivery", "Delivered", "Cancelled"];
var GOV = ["Beirut", "Mount Lebanon", "North", "Akkar", "Bekaa", "Baalbek-Hermel", "South", "Nabatieh"];
var clean = /* @__PURE__ */ __name((v, max = 200) => String(v ?? "").trim().slice(0, max), "clean");
async function listOrders(env) {
  const keys = [];
  let cursor;
  do {
    const r = await env.DATA.list({ prefix: "orders/", cursor });
    keys.push(...r.keys.map((k) => k.name));
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  const all = await Promise.all(keys.map((k) => env.DATA.get(k, "json")));
  return all.filter(Boolean).sort((a, b) => a.date < b.date ? 1 : -1);
}
__name(listOrders, "listOrders");
async function onRequest({ request, env, params }) {
  if (!env.DATA)
    return json({ error: "The store's storage is not connected yet (KV binding DATA)." }, 500);
  const path = (params.path || []).join("/");
  const m = request.method;
  const body = /* @__PURE__ */ __name(async () => {
    try {
      return await request.json();
    } catch {
      return {};
    }
  }, "body");
  if (path === "site" && m === "GET")
    return json({ ok: true, auth: "password", site: await env.DATA.get("site", "json"), cfg: await getCfg(env) });
  if (path === "login" && m === "POST") {
    const ip = request.headers.get("cf-connecting-ip") || "x";
    const rk = "rl/" + ip, tries = +await env.DATA.get(rk) || 0;
    if (tries >= 10)
      return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
    const { password } = await body();
    if (!env.ADMIN_PASSWORD || !sameText(String(password || ""), env.ADMIN_PASSWORD)) {
      await env.DATA.put(rk, String(tries + 1), { expirationTtl: 900 });
      return json({ error: "Wrong password." }, 401);
    }
    return json({ ok: true, token: await makeToken(env) });
  }
  if (path === "subscribe" && m === "POST") {
    const email = clean((await body()).email).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email))
      return json({ error: "Check the email address." }, 400);
    await env.DATA.put("subs/" + email, (/* @__PURE__ */ new Date()).toISOString());
    return json({ ok: true });
  }
  if (path === "order" && m === "POST") {
    const b = await body();
    const phone = clean(b.phone, 30).replace(/\D/g, "").replace(/^961/, "");
    const o = { name: clean(b.name, 120), email: clean(b.email), gov: clean(b.gov, 40), city: clean(b.city, 120), addr: clean(b.addr, 300), notes: clean(b.notes, 500) };
    if (o.name.length < 2)
      return json({ error: "Enter your full name." }, 400);
    if (!/^(3\d{6}|(70|71|76|78|79|81)\d{6})$/.test(phone))
      return json({ error: "Enter a Lebanese mobile number, for example 71 123 456." }, 400);
    if (!GOV.includes(o.gov))
      return json({ error: "Select your governorate." }, 400);
    if (o.city.length < 2 || o.addr.length < 4)
      return json({ error: "Add your city, street and building." }, 400);
    const lines = (Array.isArray(b.lines) ? b.lines : []).map(([id, q]) => [String(id), Math.floor(+q)]).filter(([id, q]) => COLORS.includes(id) && q > 0 && q <= 20);
    if (!lines.length)
      return json({ error: "Your cart is empty." }, 400);
    const cfg = await getCfg(env);
    for (const [id, q] of lines) {
      const c = cfg.colors[id];
      if (!c || c.visible === false || c.stock < q)
        return json({ error: `Only ${c ? c.stock : 0} Ombre ${id === "beige" ? "Beige" : "Blue"} left in stock.`, cfg }, 409);
    }
    for (const [id, q] of lines)
      cfg.colors[id].stock -= q;
    await env.DATA.put("cfg", JSON.stringify(cfg));
    const no = "OM-" + Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
    const units = lines.reduce((s, [, q]) => s + q, 0);
    const order = { no, date: (/* @__PURE__ */ new Date()).toISOString(), status: "New", ...o, phone: phone.replace(/^(\d{1,2})(\d{3})(\d{3})$/, "$1 $2 $3"), lines, price: cfg.price, delivery: cfg.delivery, total: units * cfg.price + cfg.delivery };
    await env.DATA.put("orders/" + no, JSON.stringify(order));
    return json({ ok: true, order, cfg });
  }
  if (!await isAdmin(request, env))
    return json({ error: "Please log in again." }, 401);
  if (path === "site" && m === "PUT") {
    const { site } = await body();
    if (!site || !Array.isArray(site.home))
      return json({ error: "Nothing to publish." }, 400);
    await env.DATA.put("site", JSON.stringify(site));
    await env.DATA.put("draft", JSON.stringify(site));
    return json({ ok: true });
  }
  if (path === "draft" && m === "GET")
    return json({ ok: true, draft: await env.DATA.get("draft", "json") });
  if (path === "draft" && m === "PUT") {
    const { draft } = await body();
    if (draft === null)
      await env.DATA.delete("draft");
    else
      await env.DATA.put("draft", JSON.stringify(draft));
    return json({ ok: true });
  }
  if (path === "admin" && m === "GET") {
    const subs = await env.DATA.list({ prefix: "subs/" });
    return json({ ok: true, orders: await listOrders(env), subs: subs.keys.map((k) => k.name.slice(5)), cfg: await getCfg(env) });
  }
  if (path === "cfg" && m === "PUT") {
    const b = await body(), next = await getCfg(env);
    if (b.price !== void 0) {
      if (!(+b.price > 0))
        return json({ error: "Enter a price above 0." }, 400);
      next.price = +b.price;
    }
    if (b.delivery !== void 0)
      next.delivery = Math.max(0, +b.delivery || 0);
    if (b.wa !== void 0) {
      const w = String(b.wa).replace(/\D/g, "");
      if (w.length < 10)
        return json({ error: "Enter the full WhatsApp number with 961." }, 400);
      next.wa = w;
    }
    if (b.colors) {
      for (const id of COLORS)
        if (b.colors[id])
          next.colors[id] = { stock: Math.max(0, Math.floor(+b.colors[id].stock || 0)), visible: b.colors[id].visible !== false };
    }
    if (!Object.values(next.colors).some((c) => c.visible))
      return json({ error: "Keep at least one colour visible." }, 400);
    await env.DATA.put("cfg", JSON.stringify(next));
    return json({ ok: true, cfg: next });
  }
  if (path === "order-status" && m === "PATCH") {
    const { no, status } = await body();
    if (!STATUSES.includes(status))
      return json({ error: "Unknown status." }, 400);
    const key = "orders/" + String(no).replace(/[^A-Z0-9-]/gi, "");
    const o = await env.DATA.get(key, "json");
    if (!o)
      return json({ error: "Order not found." }, 404);
    const cfg = await getCfg(env);
    const sign = status === "Cancelled" && o.status !== "Cancelled" ? 1 : o.status === "Cancelled" && status !== "Cancelled" ? -1 : 0;
    if (sign) {
      for (const [id, q] of o.lines)
        if (cfg.colors[id])
          cfg.colors[id].stock = Math.max(0, cfg.colors[id].stock + sign * q);
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
    if (!/^image\/(jpeg|png|webp)$/.test(type))
      return json({ error: "Upload a JPEG, PNG or WebP photo." }, 400);
    const buf = await request.arrayBuffer();
    if (buf.byteLength > 4e6)
      return json({ error: "That photo is too large." }, 400);
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    await env.DATA.put("media/" + id, buf, { metadata: { type } });
    return json({ ok: true, id });
  }
  return json({ error: "Not found." }, 404);
}
__name(onRequest, "onRequest");

// ../.wrangler/tmp/pages-d9zyta/functionsRoutes-0.3309141865934959.mjs
var routes = [
  {
    routePath: "/media/:id",
    mountPath: "/media",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/:path*",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];

// ../../../../tmp/claude-0/-home-claude/aa682a1f-ff53-5637-a7cf-a8fa25e23743/scratchpad/ncli/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../tmp/claude-0/-home-claude/aa682a1f-ff53-5637-a7cf-a8fa25e23743/scratchpad/ncli/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: () => {
            isFailOpen = true;
          }
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../../../../tmp/claude-0/-home-claude/aa682a1f-ff53-5637-a7cf-a8fa25e23743/scratchpad/ncli/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../tmp/claude-0/-home-claude/aa682a1f-ff53-5637-a7cf-a8fa25e23743/scratchpad/ncli/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-7pyXPO/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../../../../tmp/claude-0/-home-claude/aa682a1f-ff53-5637-a7cf-a8fa25e23743/scratchpad/ncli/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-7pyXPO/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.8380203727492197.mjs.map
