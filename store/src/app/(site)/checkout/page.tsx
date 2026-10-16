import { CheckoutView } from "@/components/cart/CheckoutView";
import { currencyOf, getDelivery, getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const supabase = await createClient();
  const [settings, { settings: delivery, regions }, { data: methods }] = await Promise.all([
    getSettings(),
    getDelivery(),
    supabase.from("payment_methods").select("key, label, description").eq("is_active", true).order("sort_order"),
  ]);
  return (
    <div className="container-x relative py-14 md:py-20">
      <h1 className="mb-10 text-6xl md:text-8xl">Checkout</h1>
      <CheckoutView currency={currencyOf(settings)} delivery={delivery} regions={regions} methods={methods ?? []} />
    </div>
  );
}
