import { UserPlan } from "@prisma/client";
import Stripe from "stripe";

import stripe from "@calcom/stripe/server";

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

export interface IDowngradeSubscription {
  subscriptionId: string;
}

export async function updateSubscription({
  subscriptionId,
}: IDowngradeSubscription): Promise<Stripe.Subscription> {
  const subscription = await retrieveSubscriptionFromStripe(subscriptionId);

  let newPriceId;
  const pricePlanResult = obtainUserPlanDetails(subscription);

  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
    proration_behavior: "create_prorations",
    items: [
      {
        id: subscription.items.data[0].id,
        price: pricePlanResult.priceId,
      },
    ],
  });
  const newSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  return newSubscription;
}

export interface IProratePreview {
  subscriptionId: string;
}

async function retrieveSubscriptionFromStripe(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
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
  if (hasProPlan) {
    priceId = getProPlanPrice();
    userPlan = UserPlan.PRO;
  } else if (hasPremiumPlan) {
    priceId = getPremiumPlanPrice();
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
