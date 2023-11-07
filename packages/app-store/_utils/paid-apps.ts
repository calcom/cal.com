import type Stripe from "stripe";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { getStripeCustomerIdFromUserId, stripe } from "./stripe";

interface RedirectArgs {
  userId: number;
  appSlug: string;
  appPaidMode: string;
  priceId: string;
}

export const withPaidAppRedirect = async ({ appSlug, appPaidMode, priceId, userId }: RedirectArgs) => {
  const redirect_uri = `${WEBAPP_URL}/api/integrations/${appSlug}/callback?checkoutId={CHECKOUT_SESSION_ID}`;

  const stripeCustomerId = await getStripeCustomerIdFromUserId(userId);
  const checkoutSession = await stripe.checkout.sessions.create({
    success_url: redirect_uri,
    cancel_url: redirect_uri,
    mode: appPaidMode === "subscription" ? "subscription" : "payment",
    payment_method_types: ["card"],
    allow_promotion_codes: true,
    customer: stripeCustomerId,
    line_items: [
      {
        quantity: 1,
        price: priceId,
      },
    ],
    client_reference_id: userId.toString(),
  });

  return checkoutSession.url;
};

export const withStripeCallback = async (
  checkoutId: string,
  callback: (args: { checkoutSession: Stripe.Checkout.Session }) => Promise<{ url: string }>
): Promise<{ url: string }> => {
  if (!checkoutId) {
    return {
      url: `/apps/installed?error=${encodeURIComponent(
        JSON.stringify({ message: "No Stripe Checkout Session ID" })
      )}`,
    };
  }

  const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutId);
  if (!checkoutSession) {
    return {
      url: `/apps/installed?error=${encodeURIComponent(
        JSON.stringify({ message: "Unknown Stripe Checkout Session ID" })
      )}`,
    };
  }

  if (checkoutSession.payment_status !== "paid") {
    return {
      url: `/apps/installed?error=${encodeURIComponent(
        JSON.stringify({ message: "Stripe Payment not processed" })
      )}`,
    };
  }

  // Execute the callback if all checks pass
  return callback({ checkoutSession });
};
