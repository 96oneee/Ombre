import assert from "node:assert/strict";
import { variantPrice, deliveryFee, discountAmount, formatMoney, round2 } from "../src/lib/pricing";
import { parseSpecs, specsToText } from "../src/lib/specs";
import { slugify, safeHref, digitsOnly } from "../src/lib/utils";

const product = { price: 80, sale_price: null };
// variant without override uses product price
assert.deepEqual(variantPrice({ price: null, sale_price: null }, product), { unit: 80, compareAt: null });
// product sale applies to variants without own price
assert.deepEqual(variantPrice({ price: null, sale_price: null }, { price: 80, sale_price: 60 }), { unit: 60, compareAt: 80 });
// variant price override ignores product sale
assert.deepEqual(variantPrice({ price: 90, sale_price: null }, { price: 80, sale_price: 60 }), { unit: 90, compareAt: null });
// variant sale
assert.deepEqual(variantPrice({ price: 90, sale_price: 70 }, product), { unit: 70, compareAt: 90 });
// sale price not lower than list is ignored
assert.deepEqual(variantPrice({ price: 50, sale_price: 50 }, product), { unit: 50, compareAt: null });

const settings = { is_enabled: true, flat_fee: 5, free_delivery_threshold: null, notes: null };
assert.equal(deliveryFee(settings, null, 80), 5);
assert.equal(deliveryFee(settings, { fee_override: 8 }, 80), 8);
assert.equal(deliveryFee({ ...settings, free_delivery_threshold: 100 }, null, 99.99), 5);
assert.equal(deliveryFee({ ...settings, free_delivery_threshold: 100 }, null, 100), 0);

assert.equal(discountAmount("percentage", 10, 160), 16);
assert.equal(discountAmount("percentage", 15, 33.33), 5);
assert.equal(discountAmount("fixed", 20, 15), 15);
assert.equal(round2(1.005), 1.01);

const usd = { code: "USD", symbol: "$", position: "before" as const };
assert.equal(formatMoney(80, usd), "$80");
assert.equal(formatMoney(80.5, usd), "$80.50");
assert.equal(formatMoney(1234.5, usd), "$1,234.50");
assert.equal(formatMoney(5, { code: "LBP", symbol: "L.L.", position: "after" }), "5 L.L.");

assert.deepEqual(parseSpecs("Dimensions: 50 x 50 cm\nFrame: Wood\n\nBad line"), [
  { label: "Dimensions", value: "50 x 50 cm" }, { label: "Frame", value: "Wood" }, { label: "Bad line", value: "" }]);
assert.equal(specsToText(parseSpecs("A: b")), "A: b");
assert.equal(slugify("  Sample Product! "), "sample-product");
assert.equal(safeHref("javascript:alert(1)"), "#");
assert.equal(safeHref("//evil.com"), "#");
assert.equal(safeHref("/shop"), "/shop");
assert.equal(safeHref("https://x.com"), "https://x.com");
assert.equal(digitsOnly("+961 71-964 944"), "96171964944");
console.log("pricing/utils logic tests passed");
