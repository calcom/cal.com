import { formatAmountForStripe } from "@lib/formatCurrency";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2020-08-27",
});

export async function createPaymentIntent(amount: number, connectedAccountId?: string) {
  const formattedAmount = formatAmountForStripe(amount);
  const params: Stripe.PaymentIntentCreateParams = {
    payment_method_types: ["card"],
    amount: formattedAmount,
    currency: process.env.NEXT_PUBLIC_CURRENCY_CODE!,
    application_fee_amount: formattedAmount * 0.1,
  };
  if (connectedAccountId) {
    params.on_behalf_of = connectedAccountId;
    params.transfer_data = {
      destination: connectedAccountId,
    };
  }
  const payment_intent: Stripe.PaymentIntent = await stripe.paymentIntents.create(params, {
    stripeAccount: connectedAccountId,
  });

  return payment_intent;
}

export default stripe;
