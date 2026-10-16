import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Card, Field, Flash, PageHeader, Table } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/pricing";
import { currencyOf, getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { createDiscount, deleteDiscount, toggleDiscount } from "./actions";

export const metadata = { title: "Discounts" };

export default async function DiscountsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const currency = currencyOf(await getSettings());
  const { data: discounts } = await supabase.from("discounts").select("*").order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Discounts" />
      <Flash ok={sp.ok} error={sp.error} />

      <Table head={["Code", "Discount", "Rules", "Used", "Status", ""]} empty="No discount codes yet.">
        {(discounts ?? []).map((d) => (
          <tr key={d.id}>
            <td className="px-4 py-3 font-medium">{d.code}{d.description && <p className="text-xs font-normal text-neutral-500">{d.description}</p>}</td>
            <td className="px-4 py-3">{d.type === "percentage" ? `${Number(d.value)}%` : formatMoney(Number(d.value), currency)}</td>
            <td className="px-4 py-3 text-xs text-neutral-600">
              {Number(d.min_order) > 0 && <p>Min order {formatMoney(Number(d.min_order), currency)}</p>}
              {d.starts_at && <p>From {formatDate(d.starts_at)}</p>}
              {d.ends_at && <p>Until {formatDate(d.ends_at)}</p>}
              {d.max_uses && <p>Max {d.max_uses} uses</p>}
            </td>
            <td className="px-4 py-3">{d.used_count}</td>
            <td className="px-4 py-3">{d.is_active ? <span className="badge bg-green-100 text-green-800">Active</span> : <span className="badge bg-neutral-200 text-neutral-600">Paused</span>}</td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <form action={toggleDiscount.bind(null, d.id, !d.is_active)}><button className="btn btn-outline btn-sm">{d.is_active ? "Pause" : "Activate"}</button></form>
                <form action={deleteDiscount.bind(null, d.id)}><ConfirmButton message={`Delete ${d.code}?`} className="btn btn-danger btn-sm">Delete</ConfirmButton></form>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Card title="Create a discount code" className="mt-8">
        <form action={createDiscount} className="grid gap-4 md:grid-cols-3">
          <Field label="Code"><input name="code" required className="input uppercase" /></Field>
          <Field label="Type">
            <select name="type" className="input"><option value="percentage">Percentage off</option><option value="fixed">Fixed amount off</option></select>
          </Field>
          <Field label="Value" hint="Percent (e.g. 10) or amount in the store currency"><input name="value" type="number" step="0.01" min="0.01" required className="input" /></Field>
          <Field label="Minimum order (optional)"><input name="min_order" type="number" step="0.01" min="0" className="input" /></Field>
          <Field label="Starts (optional)"><input name="starts_at" type="datetime-local" className="input" /></Field>
          <Field label="Ends (optional)"><input name="ends_at" type="datetime-local" className="input" /></Field>
          <Field label="Max uses (optional)"><input name="max_uses" type="number" step="1" min="1" className="input" /></Field>
          <div className="md:col-span-2"><Field label="Description (internal)"><input name="description" className="input" /></Field></div>
          <div className="md:col-span-3"><button className="btn btn-primary btn-sm">Create discount</button></div>
        </form>
      </Card>
    </>
  );
}
