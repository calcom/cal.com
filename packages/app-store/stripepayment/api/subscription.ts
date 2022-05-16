import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

import {
  FREE_PLAN_PRICE,
  FREE_PLAN_PRODUCT_ID,
  PREMIUM_PLAN_PRICE,
  PREMIUM_PLAN_PRODUCT_ID,
  PRO_PLAN_PRICE,
  PRO_PLAN_PRODUCT_ID,
} from "@calcom/stripe/constants";
import { getStripeCustomerIdFromUserId } from "@calcom/stripe/customer";
import stripe from "@calcom/stripe/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { action = null, isPremiumUsername = false } = req.body;

    const customerId = await getStripeCustomerIdFromUserId(req.session!.user.id);

    if (!customerId) {
      res.status(500).json({ message: "Missing customer id" });
      return;
    }

    const return_url = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/settings/profile`;
    const createSessionParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerId,
      return_url,
    };

    if (action) {
      let actionText = "";
      let customProductsSession = [];
      if (action === "upgrade") {
        actionText = "Upgrade your plan account";
        customProductsSession.push({ prices: [PRO_PLAN_PRICE], product: PRO_PLAN_PRODUCT_ID });
        customProductsSession.push({ prices: [PREMIUM_PLAN_PRICE], product: PREMIUM_PLAN_PRODUCT_ID });
      } else if (action === "downgrade") {
        actionText = "Downgrade your plan account";
        if (isPremiumUsername) {
          customProductsSession.push({ prices: [PRO_PLAN_PRICE], product: PRO_PLAN_PRODUCT_ID });
        }
        customProductsSession.push({ prices: [FREE_PLAN_PRICE], product: FREE_PLAN_PRODUCT_ID });
      }
      console.log({ customProductsSession });
      const configuration = await stripe.billingPortal.configurations.create({
        business_profile: {
          headline: actionText,
        },
        features: {
          payment_method_update: {
            enabled: true,
          },
          subscription_update: {
            enabled: true,
            proration_behavior: "create_prorations",
            default_allowed_updates: ["price"],
            products: customProductsSession,
          },
        },
      });
      if (configuration) {
        createSessionParams.configuration = configuration.id;
      }
    }
    const stripeSession = await stripe.billingPortal.sessions.create(createSessionParams);

    res.status(200).json({ url: stripeSession.url });
  }
}
