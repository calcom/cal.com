/**
 * This is a singleton to ensure we only instantiate Stripe once.
 */
import { Stripe, loadStripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!, {
      locale: "es-419",
    });
  }
  return stripePromise;
};

export const createPaymentIntent = async (data) => {
  const response = await fetch("/api/integrations/stripe/payment-intent", {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return response.json();
};

export default getStripe;
