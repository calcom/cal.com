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

export async function proratePreview({ subscriptionId }: IProratePreview): Promise<Stripe.Invoice> {
  try {
    console.log("3");
    // Set proration date to this moment:
    const proration_date = Math.floor(Date.now() / 1000);
    console.log("4", subscriptionId);
    const subscription = await retrieveSubscriptionFromStripe(subscriptionId);
    console.log("4.5", { subscription });
    const pricePlanResult = obtainUserPlanDetails(subscription);
    // See what the next invoice would look like with a price switch
    // and proration set:

    const items = [
      {
        id: subscription.items.data[0].id,
        price: pricePlanResult.priceId, // Switch to new price
      },
    ];
    console.log("5");
    const invoice = await stripe.invoices.retrieveUpcoming({
      customer: `${subscription.customer}`,
      subscription: subscriptionId,
      subscription_items: items,
      subscription_proration_date: proration_date,
    });
    console.log({ invoice });
    return invoice;
  } catch (error) {
    console.log(error);
    // throw new Error();
  }
  return {} as Stripe.Invoice;
}

async function retrieveSubscriptionFromStripe(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

// @NOTE: REMOVE WHEN PLAN IS SAVED ON DB AND NOT ON STRIPE ONLY
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
