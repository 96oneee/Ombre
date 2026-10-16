import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { MediaInput } from "@/components/admin/MediaField";
import { Card, Field, Flash, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { addRegion, addStatus, deleteRegion, moveRegion, saveDelivery, saveSiteSettings, saveStatus, setPaymentActive, updateRegion } from "./actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const s = await getSettings();

  const [{ data: delivery }, { data: regions }, { data: methods }, { data: statuses }] = await Promise.all([
    supabase.from("delivery_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("delivery_regions").select("*").order("sort_order").order("name"),
    supabase.from("payment_methods").select("*").order("sort_order"),
    supabase.from("order_statuses").select("*").order("sort_order"),
  ]);

  return (
    <>
      <PageHeader title="Settings" />
      <Flash ok={sp.ok} error={sp.error} />

      <div className="space-y-8">
        {/* ---------------------------------------------------------- site */}
        <form action={saveSiteSettings} className="space-y-6">
          <Card title="Brand">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Brand name"><input name="brand_name" defaultValue={s.brand_name} required className="input" /></Field>
              <Field label="Logo" hint="Shown in the header. If empty, the brand name is shown as text.">
                <MediaInput name="logo_path" defaultValue={s.logo_path} folder="brand" />
              </Field>
            </div>
          </Card>

          <Card title="Contact">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="WhatsApp number" hint="Digits with country code, e.g. 96171123456. Used for all WhatsApp buttons."><input name="whatsapp_number" defaultValue={s.whatsapp_number} inputMode="numeric" className="input" /></Field>
              <Field label="Instagram link"><input name="instagram_url" defaultValue={s.instagram_url} placeholder="https://www.instagram.com/…" className="input" /></Field>
              <Field label="Email"><input name="contact_email" type="email" defaultValue={s.contact_email} className="input" /></Field>
              <Field label="Phone (shown in footer)"><input name="contact_phone" defaultValue={s.contact_phone} className="input" /></Field>
              <div className="md:col-span-2"><Field label="Address (optional)"><input name="address" defaultValue={s.address} className="input" /></Field></div>
            </div>
          </Card>

          <Card title="Footer and announcement">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2"><Field label="Footer text"><textarea name="footer_text" defaultValue={s.footer_text} rows={2} className="input" /></Field></div>
              <Field label="Copyright text" hint="The year is added automatically."><input name="copyright_text" defaultValue={s.copyright_text} className="input" /></Field>
              <div />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="announcement_enabled" defaultChecked={s.announcement_enabled} className="h-4 w-4 accent-[#227b92]" /> Show announcement bar at the top of the site</label>
              <Field label="Announcement text"><input name="announcement_text" defaultValue={s.announcement_text} className="input" /></Field>
            </div>
          </Card>

          <Card title="Store">
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Currency code" hint="Saved on each order"><input name="currency_code" defaultValue={s.currency_code} maxLength={3} className="input uppercase" /></Field>
              <Field label="Currency symbol"><input name="currency_symbol" defaultValue={s.currency_symbol} maxLength={5} className="input" /></Field>
              <Field label="Symbol position">
                <select name="currency_position" defaultValue={s.currency_position} className="input"><option value="before">Before ($50)</option><option value="after">After (50 $)</option></select>
              </Field>
              <Field label="Language"><input name="site_language" defaultValue={s.site_language} className="input" readOnly aria-readonly /></Field>
              <div className="md:col-span-4"><Field label="Site URL" hint="Your live address, e.g. https://www.yourdomain.com"><input name="site_url" defaultValue={s.site_url} className="input" /></Field></div>
            </div>
          </Card>
          <button className="btn btn-primary">Save settings</button>
        </form>

        {/* ------------------------------------------------------- delivery */}
        <Card title="Delivery">
          <form action={saveDelivery} className="grid gap-4 md:grid-cols-3">
            <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="is_enabled" defaultChecked={delivery?.is_enabled ?? true} className="h-4 w-4 accent-[#227b92]" /> Delivery is available</label>
            <Field label="Delivery fee" hint="Used for every region without its own fee"><input name="flat_fee" type="number" step="0.01" min="0" defaultValue={delivery?.flat_fee ?? 0} className="input" /></Field>
            <Field label="Free delivery over (optional)" hint="Order total after discounts. Empty = never free."><input name="free_delivery_threshold" type="number" step="0.01" min="0" defaultValue={delivery?.free_delivery_threshold ?? ""} className="input" /></Field>
            <div className="md:col-span-3"><Field label="Delivery notes" hint="Shown at checkout and on product pages."><input name="notes" defaultValue={delivery?.notes ?? ""} className="input" /></Field></div>
            <div className="md:col-span-3"><button className="btn btn-primary btn-sm">Save delivery settings</button></div>
          </form>

          <h3 className="mb-2 mt-8 font-body text-base font-medium">Delivery regions</h3>
          <p className="mb-3 text-sm text-neutral-500">Customers choose one of these at checkout. Leave the fee empty to use the delivery fee above.</p>
          <ul className="divide-y divide-neutral-100">
            {(regions ?? []).map((r, i) => (
              <li key={r.id} className="py-3">
                <form action={updateRegion.bind(null, r.id)} className="flex flex-wrap items-center gap-2">
                  <input name="name" defaultValue={r.name} aria-label="Region name" className="input !min-h-[36px] w-48 !py-1" />
                  <input name="fee_override" type="number" step="0.01" min="0" defaultValue={r.fee_override ?? ""} placeholder="Default fee" aria-label="Fee for this region" className="input !min-h-[36px] w-32 !py-1" />
                  <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="is_active" defaultChecked={r.is_active} className="h-4 w-4 accent-[#227b92]" /> Active</label>
                  <button className="btn btn-outline btn-sm">Save</button>
                </form>
                <div className="mt-2 flex gap-2">
                  <form action={moveRegion.bind(null, r.id, "up")}><button className="btn btn-outline btn-sm !min-h-[30px]" disabled={i === 0} aria-label={`Move ${r.name} up`}>↑</button></form>
                  <form action={moveRegion.bind(null, r.id, "down")}><button className="btn btn-outline btn-sm !min-h-[30px]" disabled={i === (regions ?? []).length - 1} aria-label={`Move ${r.name} down`}>↓</button></form>
                  <form action={deleteRegion.bind(null, r.id)}><ConfirmButton message={`Delete ${r.name}?`} className="btn btn-danger btn-sm !min-h-[30px]">Delete</ConfirmButton></form>
                </div>
              </li>
            ))}
          </ul>
          <form action={addRegion} className="mt-4 flex flex-wrap items-end gap-2 border-t border-neutral-200 pt-4">
            <Field label="New region"><input name="name" required className="input !min-h-[36px] w-48 !py-1" /></Field>
            <Field label="Fee (optional)"><input name="fee_override" type="number" step="0.01" min="0" className="input !min-h-[36px] w-32 !py-1" /></Field>
            <button className="btn btn-outline btn-sm">Add region</button>
          </form>
        </Card>

        {/* -------------------------------------------------------- payment */}
        <Card title="Payment methods">
          <ul className="divide-y divide-neutral-100">
            {(methods ?? []).map((m) => (
              <li key={m.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{m.label}</p>
                  <p className="text-sm text-neutral-500">{m.description}</p>
                </div>
                <form action={setPaymentActive.bind(null, m.key, !m.is_active)}>
                  <button className="btn btn-outline btn-sm">{m.is_active ? "Active: click to disable" : "Disabled: click to enable"}</button>
                </form>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-neutral-500">Card payments can be added later without changing checkout.</p>
        </Card>

        {/* --------------------------------------------------------- status */}
        <Card title="Order statuses">
          <ul className="divide-y divide-neutral-100">
            {(statuses ?? []).map((st) => (
              <li key={st.key} className="py-3">
                <form action={saveStatus.bind(null, st.key)} className="flex flex-wrap items-center gap-2">
                  <input name="label" defaultValue={st.label} aria-label="Status name" className="input !min-h-[36px] w-44 !py-1" />
                  <input name="color" type="color" defaultValue={st.color} aria-label="Status color" className="h-9 w-12 cursor-pointer rounded border border-neutral-300 bg-white p-1" />
                  <input name="sort_order" type="number" defaultValue={st.sort_order} aria-label="Order" className="input !min-h-[36px] w-20 !py-1" />
                  <button className="btn btn-outline btn-sm">Save</button>
                  {st.is_default && <span className="badge bg-neutral-100 text-neutral-600">New orders start here</span>}
                  {st.restocks_inventory && <span className="badge bg-neutral-100 text-neutral-600">Puts items back in stock</span>}
                </form>
              </li>
            ))}
          </ul>
          <form action={addStatus} className="mt-4 flex flex-wrap items-end gap-2 border-t border-neutral-200 pt-4">
            <Field label="New status"><input name="label" required className="input !min-h-[36px] w-44 !py-1" /></Field>
            <Field label="Color"><input name="color" type="color" defaultValue="#6b7280" className="h-9 w-12 cursor-pointer rounded border border-neutral-300 bg-white p-1" /></Field>
            <Field label="Order"><input name="sort_order" type="number" defaultValue={100} className="input !min-h-[36px] w-20 !py-1" /></Field>
            <button className="btn btn-outline btn-sm">Add status</button>
          </form>
        </Card>
      </div>
    </>
  );
}
