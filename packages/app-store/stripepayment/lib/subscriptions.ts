import { UserPlan } from "@prisma/client";
import Stripe from "stripe";

import stripe from "./server";
import {
  getFreePlanPrice,
  getPremiumPlanPrice,
  getProPlanPrice,
  getFreePlanProductId,
  getPremiumPlanProductId,
  getProPlanProductId,
} from "./utils";

interface IRetrieveSubscriptionIdResponse {
  message?: string;
  subscriptionId?: string;
}

export async function retrieveSubscriptionIdFromStripeCustomerId(
  stripeCustomerId: string
): Promise<IRetrieveSubscriptionIdResponse> {
  const customer = await stripe.customers.retrieve(stripeCustomerId, {
    expand: ["subscriptions.data.plan"],
  });
  if (!customer || customer.deleted) {
    return {
      message: "Not found",
    };
  }

  const subscription = customer.subscriptions?.data[0];
  if (!subscription) {
    return {
      message: "Not found",
    };
  }
  return {
    subscriptionId: subscription.id,
  };
}

// @NOTE: Remove when user subscription plan id is saved on db and not on stripe only
export function obtainUserPlanDetails(subscription: Stripe.Subscription) {
  const proPlanProductId = getProPlanProductId();
  const premiumPlanProductId = getPremiumPlanProductId();
  const freePlanProductId = getFreePlanProductId();
  let priceId = "";
  const hasProPlan = !!subscription.items.data.find((item) => item.plan.product === proPlanProductId);
  const hasPremiumPlan = !!subscription.items.data.find((item) => item.plan.product === premiumPlanProductId);
  const hasFreePlan = !!subscription.items.data.find((item) => item.plan.product === freePlanProductId);
  let userPlan: UserPlan;
  if (hasPremiumPlan) {
    priceId = getPremiumPlanPrice();
    userPlan = UserPlan.PRO;
  } else if (hasProPlan) {
    priceId = getProPlanPrice();
    userPlan = UserPlan.PRO;
  } else if (hasFreePlan) {
    priceId = getFreePlanPrice();
    userPlan = UserPlan.FREE;
  } else {
    userPlan = UserPlan.TRIAL;
  }

  return {
    userPlan,
    priceId,
    isProPlan: hasProPlan,
    isPremiumPlan: hasPremiumPlan,
    isFreePlan: hasFreePlan,
  };
}
