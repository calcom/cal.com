import { UserPlan } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

import { checkPremiumUsername } from "@calcom/ee/lib/core/checkPremiumUsername";
import prisma from "@calcom/prisma";
import {
  PREMIUM_PLAN_PRICE,
  PREMIUM_PLAN_PRODUCT_ID,
  PRO_PLAN_PRICE,
  PRO_PLAN_PRODUCT_ID,
} from "@calcom/stripe/constants";
import { getStripeCustomerIdFromUserId } from "@calcom/stripe/customer";
import stripe from "@calcom/stripe/server";

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
  const isUserPremium = userCurrentPlan === UserPlan.PRO;
  let resultCondition = UsernameChangeStatusEnum.NORMAL;
  if (isUserPremium && isNewUsernamePremium) {
    resultCondition = UsernameChangeStatusEnum.UPGRADE;
  } else if (isUserPremium && !isNewUsernamePremium) {
    resultCondition = UsernameChangeStatusEnum.DOWNGRADE;
  }
  return resultCondition;
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
    const isCurrentlyPremium =
      userData?.metadata && typeof userData.metadata === "object" && "stripeCustomerId" in userData.metadata;
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
