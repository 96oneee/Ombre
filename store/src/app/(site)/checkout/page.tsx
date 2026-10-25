import { CheckoutView } from "@/components/cart/CheckoutView";
import { currencyOf, getDelivery, getPaymentMethods, getSettings } from "@/lib/settings";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [settings, { settings: delivery, regions }, methods] = await Promise.all([
    getSettings(),
    getDelivery(),
    getPaymentMethods(),
  ]);
  return (
    <div className="container-x relative py-14 md:py-20">
      <h1 className="mb-10 text-6xl md:text-8xl">Checkout</h1>
      <CheckoutView currency={currencyOf(settings)} delivery={delivery} regions={regions} methods={methods ?? []} />
    </div>
  );
}
