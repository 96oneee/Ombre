/**
 * Payment abstraction.
 *
 * Checkout always does the same thing: create the order (place_order), then ask the
 * payment method's provider what to do next. Cash on delivery needs nothing more.
 * To add Stripe / a local gateway later:
 *   1. add a row to the payment_methods table (from Admin) with provider = "stripe"
 *   2. add src/lib/payments/stripe.ts implementing PaymentProvider
 *   3. register it in `providers` below
 * Checkout itself does not change.
 */
export interface PaymentOrder {
  orderNumber: string;
  total: number;
  currency: string;
}

export type PaymentAction =
  | { kind: "none" } // nothing to do: show the confirmation page
  | { kind: "redirect"; url: string }; // send the customer to a hosted payment page

export interface PaymentProvider {
  id: string;
  start(order: PaymentOrder): Promise<PaymentAction>;
}

const cashOnDelivery: PaymentProvider = {
  id: "cod",
  async start() {
    return { kind: "none" };
  },
};

const providers: Record<string, PaymentProvider> = {
  [cashOnDelivery.id]: cashOnDelivery,
};

export function getPaymentProvider(id: string): PaymentProvider {
  return providers[id] ?? cashOnDelivery;
}
