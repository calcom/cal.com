import { UserPlan } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

import { checkPremiumUsername } from "@calcom/features/ee/common/lib/checkPremiumUsername";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import {
  PREMIUM_PLAN_PRICE,
  PREMIUM_PLAN_PRODUCT_ID,
  PRO_PLAN_PRICE,
  PRO_PLAN_PRODUCT_ID,
} from "../lib/constants";
import { getStripeCustomerIdFromUserId } from "../lib/customer";
import stripe from "../lib/server";

enum UsernameChangeStatusEnum {
  NORMAL = "NORMAL",
  UPGRADE = "UPGRADE",
  DOWNGRADE = "DOWNGRADE",
}

const obtainNewConditionAction = ({
  userCurrentPlan,
  isNewUsernamePremium,
}: {
  userCurrentPlan: UserPlan;
  isNewUsernamePremium: boolean;
}) => {
  if (userCurrentPlan === UserPlan.PRO) {
    if (isNewUsernamePremium) return UsernameChangeStatusEnum.UPGRADE;
    return UsernameChangeStatusEnum.DOWNGRADE;
  }
  return UsernameChangeStatusEnum.NORMAL;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const userId = req.session?.user.id;
    let { intentUsername = null } = req.query;

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

    // Save the intentUsername in the metadata
    await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...(userData.metadata as Prisma.JsonObject),
          intentUsername,
        },
      },
    });

    const return_url = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/settings/profile`;
    const createSessionParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerId,
      return_url,
    };

    const checkPremiumResult = await checkPremiumUsername(intentUsername);
    if (!checkPremiumResult.available) {
      return res.status(404).json({ message: "Intent username not available" });
    }

    if (userData && (userData.plan === UserPlan.FREE || userData.plan === UserPlan.TRIAL)) {
      const subscriptionPrice = checkPremiumResult.premium ? PREMIUM_PLAN_PRICE : PRO_PLAN_PRICE;
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
      if (checkoutSession && checkoutSession.url) {
        return res.redirect(checkoutSession.url).end();
      }
      return res.status(404).json({ message: "Couldn't redirect to stripe checkout session" });
    }

    const action = obtainNewConditionAction({
      userCurrentPlan: userData?.plan ?? UserPlan.FREE,
      isNewUsernamePremium: checkPremiumResult.premium,
    });

    if (action && userData) {
      let actionText = "";
      const customProductsSession = [];
      if (action === UsernameChangeStatusEnum.UPGRADE) {
        actionText = "Upgrade your plan account";
        if (checkPremiumResult.premium) {
          customProductsSession.push({ prices: [PREMIUM_PLAN_PRICE], product: PREMIUM_PLAN_PRODUCT_ID });
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
      if (configuration) {
        createSessionParams.configuration = configuration.id;
      }
    }
    const stripeSession = await stripe.billingPortal.sessions.create(createSessionParams);

    res.redirect(stripeSession.url).end();
  }
}
