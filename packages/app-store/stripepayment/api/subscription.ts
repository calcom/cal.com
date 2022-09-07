import { UserPlan } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

import {
  getPremiumPlanMode,
  getPremiumPlanPrice,
  getPremiumPlanProductId,
} from "@calcom/app-store/stripepayment/lib/utils";
import { checkPremiumUsername } from "@calcom/features/ee/common/lib/checkPremiumUsername";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import { PRO_PLAN_PRICE, PRO_PLAN_PRODUCT_ID } from "../lib/constants";
import { getStripeCustomerIdFromUserId } from "../lib/customer";
import stripe from "../lib/server";

export enum UsernameChangeStatusEnum {
  NORMAL = "NORMAL",
  UPGRADE = "UPGRADE",
  DOWNGRADE = "DOWNGRADE",
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const userId = req.session?.user.id;

    let { intentUsername = null } = req.query;
    const { action, callbackUrl } = req.query;
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
      select: { id: true, plan: true, metadata: true },
    });
    if (!userData) {
      res.status(404).json({ message: "Missing user data" });
      return;
    }

    const isCurrentlyPremium = hasKeyInMetadata(userData, "isPremium") && !!userData.metadata.isPremium;

    const return_url = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/stripepayment/paymentCallback?checkoutSessionId={CHECKOUT_SESSION_ID}&callbackUrl=${callbackUrl}`;
    const createSessionParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerId,
      return_url,
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

    if (userData && (userData.plan === UserPlan.FREE || userData.plan === UserPlan.TRIAL)) {
      const subscriptionPrice = checkPremiumResult.premium ? getPremiumPlanPrice() : PRO_PLAN_PRICE;
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: getPremiumPlanMode(),
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
      // Save the intentUsername in the metadata
      await prisma.user.update({
        where: { id: userId },
        data: {
          metadata: {
            ...(userData.metadata as Prisma.JsonObject),
            checkoutSessionId: checkoutSession.id,
            intentUsername,
          },
        },
      });
      if (checkoutSession && checkoutSession.url) {
        return res.redirect(checkoutSession.url).end();
      }
      return res.status(404).json({ message: "Couldn't redirect to stripe checkout session" });
    }

    if (action && userData) {
      let actionText = "";
      const customProductsSession = [];
      if (action === UsernameChangeStatusEnum.UPGRADE) {
        actionText = "Upgrade your plan account";
        if (checkPremiumResult.premium) {
          customProductsSession.push({ prices: [getPremiumPlanPrice()], product: getPremiumPlanProductId() });
        } else {
          customProductsSession.push({ prices: [PRO_PLAN_PRICE], product: PRO_PLAN_PRODUCT_ID });
        }
      } else if (action === UsernameChangeStatusEnum.DOWNGRADE) {
        actionText = "Downgrade your plan account";
        if (isCurrentlyPremium) {
          customProductsSession.push({ prices: [PRO_PLAN_PRICE], product: PRO_PLAN_PRODUCT_ID });
        }
      }

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
            proration_behavior: "always_invoice",
            default_allowed_updates: ["price"],
            products: customProductsSession,
          },
        },
      });
      await prisma.user.update({
        where: { id: userId },
        data: {
          metadata: {
            ...(userData.metadata as Prisma.JsonObject),
            intentUsername,
          },
        },
      });
      if (configuration) {
        createSessionParams.configuration = configuration.id;
      }
    }
    const stripeSession = await stripe.billingPortal.sessions.create(createSessionParams);

    res.redirect(stripeSession.url).end();
  }
}
