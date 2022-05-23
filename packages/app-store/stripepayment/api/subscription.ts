import { UserPlan } from "@prisma/client";
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
    const userId = req.session!.user.id;
    const { action = null, isPremiumUsername = false } = req.body;
    console.log({ action, isPremiumUsername });
    const customerId = await getStripeCustomerIdFromUserId(userId);

    if (!customerId) {
      res.status(500).json({ message: "Missing customer id" });
      return;
    }
    const userData = await prisma?.user.findFirst({
      where: { id: userId },
      select: { id: true, plan: true, metadata: true },
    });
    const isCurrentlyPremium =
      userData?.metadata && typeof userData.metadata === "object" && "stripeCustomerId" in userData.metadata;
    const return_url = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/settings/profile`;
    const createSessionParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerId,
      return_url,
    };

    if (userData && (userData.plan === UserPlan.FREE || userData.plan === UserPlan.TRIAL)) {
      const subscriptionPrice = isPremiumUsername ? PREMIUM_PLAN_PRICE : PRO_PLAN_PRICE;
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer: customerId,
        line_items: [
          {
            price: subscriptionPrice,
            quantity: 1,
          },
        ],
        success_url: return_url,
        cancel_url: return_url,
        allow_promotion_codes: true,
      });
      res.status(200).json({ url: checkoutSession.url });
    }

    if (action && userData) {
      let actionText = "";
      const customProductsSession = [];
      if (action === "upgrade") {
        actionText = "Upgrade your plan account";
        if (isPremiumUsername) {
          customProductsSession.push({ prices: [PREMIUM_PLAN_PRICE], product: PREMIUM_PLAN_PRODUCT_ID });
        } else {
          customProductsSession.push({ prices: [PRO_PLAN_PRICE], product: PRO_PLAN_PRODUCT_ID });
        }
      } else if (action === "downgrade") {
        actionText = "Downgrade your plan account";
        if (isCurrentlyPremium) {
          customProductsSession.push({ prices: [PRO_PLAN_PRICE], product: PRO_PLAN_PRODUCT_ID });
        }
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
