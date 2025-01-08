import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";

import { getPremiumMonthlyPlanPriceId } from "@calcom/app-store/stripepayment/lib/utils";
import { checkPremiumUsername } from "@calcom/features/ee/common/lib/checkPremiumUsername";
import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import { getStripeCustomerIdFromUserId } from "../lib/customer";
import stripe from "../lib/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const userId = req.session?.user.id;
    let { intentUsername = null } = req.query;
    const { callbackUrl } = req.query;
    if (!userId || !intentUsername) {
      res.status(404).end();
      return;
    }
    if (intentUsername && typeof intentUsername === "object") {
      intentUsername = intentUsername[0];
    }
    const customerId = await getStripeCustomerIdFromUserId(userId);
    if (!customerId) {
      res.status(404).json({ message: "Missing customer id" });
      return;
    }

    const userData = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, metadata: true },
    });
    if (!userData) {
      res.status(404).json({ message: "Missing user data" });
      return;
    }

    const return_url = `${WEBAPP_URL}/api/integrations/stripepayment/paymentCallback?checkoutSessionId={CHECKOUT_SESSION_ID}&callbackUrl=${callbackUrl}`;
    const createSessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [
        {
          quantity: 1,
          price: getPremiumMonthlyPlanPriceId(),
        },
      ],
      allow_promotion_codes: true,
      customer: customerId,
      success_url: return_url,
      cancel_url: return_url,
    };

    const checkPremiumResult = await checkPremiumUsername(intentUsername);
    if (!checkPremiumResult.available) {
      return res.status(404).json({ message: "Intent username not available" });
    }
    const stripeCustomer = await stripe.customers.retrieve(customerId);
    if (!stripeCustomer || stripeCustomer.deleted) {
      return res.status(400).json({ message: "Stripe customer not found or deleted" });
    }
    await stripe.customers.update(customerId, {
      metadata: {
        ...stripeCustomer.metadata,
        username: intentUsername,
      },
    });

    if (userData) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          metadata: {
            ...((userData.metadata as Prisma.JsonObject) || {}),
            isPremium: false,
          },
        },
      });
    }
    const checkoutSession = await stripe.checkout.sessions.create(createSessionParams);
    if (checkoutSession && checkoutSession.url) {
      return res.redirect(checkoutSession.url).end();
    }
    return res.status(404).json({ message: "Couldn't redirect to stripe checkout session" });
  }
}
