import { CartView } from "@/components/cart/CartView";
import { currencyOf, getDelivery, getSettings } from "@/lib/settings";

export const metadata = { title: "Cart" };

export default async function CartPage() {
  const [settings, { settings: delivery, regions }] = await Promise.all([getSettings(), getDelivery()]);
  return (
    <div className="container-x py-14 md:py-20">
      <h1 className="mb-10 text-6xl md:text-8xl">Cart</h1>
      <CartView currency={currencyOf(settings)} delivery={delivery} regions={regions} />
    </div>
  );
}
