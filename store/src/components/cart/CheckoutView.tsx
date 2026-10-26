"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { useCartLines } from "@/components/cart/useCartLines";
import { placeOrderAction } from "@/app/(site)/checkout/actions";
import { createClient } from "@/lib/supabase/client";
import { deliveryFee, formatMoney } from "@/lib/pricing";
import type { Currency, DeliveryRegion, DeliverySettings } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Method {
  key: string;
  label: string;
  description: string | null;
}

type Errors = Partial<Record<"full_name" | "phone" | "email" | "region" | "city" | "address", string>>;

function validPhone(v: string): boolean {
  const d = v.replace(/\D/g, "").replace(/^0+/, "");
  const national = d.startsWith("961") && d.length > 8 ? d.slice(3) : d;
  return national.length >= 7 && national.length <= 8;
}

export function CheckoutView({
  currency,
  delivery,
  regions,
  methods,
}: {
  currency: Currency;
  delivery: DeliverySettings;
  regions: DeliveryRegion[];
  methods: Method[];
}) {
  const router = useRouter();
  const { items, ready, clear } = useCart();
  const { lines, unavailable, subtotal, problems, loading } = useCartLines(items, ready);
  const money = (n: number) => formatMoney(n, currency);

  const [form, setForm] = useState({ full_name: "", phone: "", email: "", region: "", city: "", address: "", notes: "", website: "" });
  const [method, setMethod] = useState(methods[0]?.key ?? "cod");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState("");
  const [pending, startTransition] = useTransition();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const region = regions.find((r) => r.id === form.region) ?? null;
  const discountValue = discount?.amount ?? 0;
  const fee = delivery.is_enabled ? deliveryFee(delivery, region, subtotal - discountValue) : 0;
  const total = subtotal - discountValue + fee;

  async function applyCode() {
    setCodeMsg(null);
    if (!code.trim()) return;
    const { data, error } = await createClient().rpc("validate_discount", { p_code: code, p_subtotal: subtotal });
    if (error || !data) {
      setCodeMsg({ ok: false, text: "We couldn't check that code. Please try again." });
      return;
    }
    if (data.valid) {
      setDiscount({ code: data.code, amount: Number(data.amount) });
      setCodeMsg({ ok: true, text: `Code ${data.code} applied.` });
    } else {
      setDiscount(null);
      setCodeMsg({ ok: false, text: data.message });
    }
  }

  function validate(): Errors {
    const e: Errors = {};
    if (form.full_name.trim().length < 2) e.full_name = "Enter your full name.";
    if (!validPhone(form.phone)) e.phone = "Enter a valid phone number, for example 71 123 456.";
    if (form.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) e.email = "Enter a valid email or leave it empty.";
    if (!form.region) e.region = "Choose your governorate.";
    if (form.city.trim().length < 2) e.city = "Enter your city or area.";
    if (form.address.trim().length < 5) e.address = "Enter your street, building and floor.";
    return e;
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setSubmitError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = document.querySelector<HTMLElement>("[aria-invalid='true']");
      first?.focus();
      return;
    }
    startTransition(async () => {
      const res = await placeOrderAction({
        customer: {
          full_name: form.full_name,
          // numbers typed without a country code are treated as Lebanese by the database
          phone: form.phone.trim().startsWith("+") ? form.phone.trim() : `+961${form.phone.replace(/\D/g, "").replace(/^0+/, "").replace(/^961(?=\d{7,8}$)/, "")}`,
          email: form.email,
          city: form.city,
          address: form.address,
          notes: form.notes,
        },
        items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
        region_id: form.region,
        payment_method: method,
        discount_code: discount?.code ?? "",
        website: form.website,
      });
      if (!res.ok) {
        setSubmitError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      clear();
      if (res.redirectUrl) window.location.href = res.redirectUrl;
      else router.push(`/order/${res.orderNumber}`);
    });
  }

  if (loading) return <p className="py-20 text-ink-soft" role="status">Loading…</p>;
  if (lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-4xl">Your cart is empty</p>
        <Link href="/shop" className="btn btn-primary mt-8">Go to shop</Link>
      </div>
    );
  }

  const fieldError = (k: keyof Errors) => (errors[k] ? <p id={`${k}-err`} className="mt-1 text-sm text-red-700">{errors[k]}</p> : null);
  const inputProps = (k: keyof Errors) => ({
    "aria-invalid": errors[k] ? (true as const) : undefined,
    "aria-describedby": errors[k] ? `${k}-err` : undefined,
    className: cn("input", errors[k] && "border-red-500"),
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-12 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-10">
        {(submitError || unavailable.length > 0 || problems.length > 0 || !delivery.is_enabled) && (
          <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            {submitError ||
              (!delivery.is_enabled
                ? "Delivery is currently unavailable."
                : "Some items in your cart changed. Please review your cart before ordering.")}{" "}
            <Link href="/cart" className="underline">Back to cart</Link>
          </div>
        )}

        <fieldset className="space-y-4">
          <legend className="mb-2 font-display text-3xl">Contact</legend>
          <div>
            <label className="label" htmlFor="full_name">Full name</label>
            <input id="full_name" autoComplete="name" value={form.full_name} onChange={set("full_name")} {...inputProps("full_name")} />
            {fieldError("full_name")}
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone number</label>
            <div className="flex">
              <span className="grid place-items-center rounded-l-lg border border-r-0 border-ink/20 bg-linen px-3.5">+961</span>
              <input id="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="71 123 456" value={form.phone} onChange={set("phone")} {...inputProps("phone")} className={cn("input rounded-l-none", errors.phone && "border-red-500")} />
            </div>
            <p className="hint">We use it to confirm your delivery.</p>
            {fieldError("phone")}
          </div>
          <div>
            <label className="label" htmlFor="email">Email <span className="text-ink-soft">(optional)</span></label>
            <input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} {...inputProps("email")} />
            {fieldError("email")}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-2 font-display text-3xl">Delivery address</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="region">Governorate</label>
              <select id="region" value={form.region} onChange={set("region")} {...inputProps("region")}>
                <option value="">Select</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {fieldError("region")}
            </div>
            <div>
              <label className="label" htmlFor="city">City or area</label>
              <input id="city" autoComplete="address-level2" value={form.city} onChange={set("city")} {...inputProps("city")} />
              {fieldError("city")}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="address">Street, building, floor</label>
            <input id="address" autoComplete="street-address" value={form.address} onChange={set("address")} {...inputProps("address")} />
            {fieldError("address")}
          </div>
          <div>
            <label className="label" htmlFor="notes">Delivery notes <span className="text-ink-soft">(optional)</span></label>
            <textarea id="notes" className="input" value={form.notes} onChange={set("notes")} maxLength={500} />
          </div>
          {delivery.notes && <p className="hint">{delivery.notes}</p>}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-2 font-display text-3xl">Payment</legend>
          {methods.length === 0 && <p className="text-sm text-red-700">No payment method is available right now.</p>}
          {methods.map((m) => (
            <label key={m.key} className={cn("flex cursor-pointer items-start gap-3 border p-4", method === m.key ? "border-charcoal" : "border-charcoal/20")}>
              <input type="radio" name="payment" className="mt-1 h-4 w-4 accent-[#227b92]" checked={method === m.key} onChange={() => setMethod(m.key)} />
              <span>
                <span className="block font-normal">{m.label}</span>
                {m.description && <span className="text-sm text-ink-soft">{m.description}</span>}
              </span>
            </label>
          ))}
        </fieldset>

        {/* honeypot: hidden from people, bots fill it in */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label>
        </div>
      </div>

      <aside className="h-fit bg-dune/60 p-6 md:p-8 lg:sticky lg:top-28" aria-labelledby="sum-h">
        <h2 id="sum-h" className="text-3xl">Your order</h2>
        <ul className="mt-4 divide-y divide-ink/15">
          {lines.map((l) => (
            <li key={l.variantId} className="flex justify-between gap-4 py-3 text-sm">
              <span>
                {l.productName} <span className="text-ink-soft">{l.variantName} × {l.quantity}</span>
              </span>
              <span>{money(l.unit * l.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4">
          <label className="label" htmlFor="code">Discount code</label>
          <div className="flex gap-2">
            <input id="code" className="input" value={code} onChange={(e) => { setCode(e.target.value); setDiscount(null); setCodeMsg(null); }} autoComplete="off" />
            <button type="button" className="btn btn-outline btn-sm self-stretch" onClick={applyCode}>Apply</button>
          </div>
          {codeMsg && <p role="status" className={cn("mt-1 text-sm", codeMsg.ok ? "text-green-800" : "text-red-700")}>{codeMsg.text}</p>}
        </div>

        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{money(subtotal)}</dd></div>
          {discountValue > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount</dt><dd>−{money(discountValue)}</dd></div>}
          <div className="flex justify-between">
            <dt className="text-ink-soft">Delivery</dt>
            <dd>{!delivery.is_enabled ? "Unavailable" : !region && regions.some((r) => r.fee_override != null) ? "Choose region" : fee === 0 ? "Free" : money(fee)}</dd>
          </div>
          <div className="flex justify-between border-t border-ink/15 pt-3 text-lg font-normal"><dt>Total</dt><dd>{money(total)}</dd></div>
        </dl>

        <button type="submit" className="btn btn-primary mt-6 w-full" disabled={pending || methods.length === 0 || !delivery.is_enabled || problems.length > 0 || unavailable.length > 0}>
          {pending ? "Placing order…" : "Place order"}
        </button>
        <p className="mt-3 text-center text-xs text-ink-soft">The final total is confirmed by our system when you place the order.</p>
      </aside>
    </form>
  );
}
