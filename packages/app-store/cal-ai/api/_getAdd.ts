import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultResponder } from "@calcom/lib/server";

import checkSession from "../../_utils/auth";
import appConfig from "../config.json";
import { getStripeCustomerIdFromUserId, stripe } from "../lib/stripe";

export async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const session = checkSession(req);
  const slug = appConfig.slug;

  const redirect_uri = `${WEBAPP_URL}/api/integrations/${slug}/callback?checkoutId={CHECKOUT_SESSION_ID}`;

  const stripeCustomerId = await getStripeCustomerIdFromUserId(session.user.id);
  const checkoutSession = await stripe.checkout.sessions.create({
    success_url: redirect_uri,
    cancel_url: redirect_uri,
    mode: "payment",
    payment_method_types: ["card"],
    allow_promotion_codes: true,
    customer: stripeCustomerId,
    line_items: [
      {
        quantity: 1,
        price: appConfig.paid.priceId,
      },
    ],
  });

  if (!checkoutSession) {
    return res.status(500).json({ message: "Failed to create Stripe checkout session" });
  }

  return { url: checkoutSession.url };
}

export default defaultResponder(getHandler);
