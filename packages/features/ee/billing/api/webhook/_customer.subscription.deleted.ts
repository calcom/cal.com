import { prisma } from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import type { LazyModule, SWHMap } from "./__handler";
import { HttpCode } from "./__handler";

type Data = SWHMap["customer.subscription.deleted"]["data"];

type Handlers = Record<`prod_${string}`, () => LazyModule<Data>>;

const STRIPE_TEAM_PRODUCT_ID = process.env.STRIPE_TEAM_PRODUCT_ID || "";

const stripeWebhookProductHandler = (handlers: Handlers) => async (data: Data) => {
  const subscription = data.object;

  // Check if this is a phone number subscription first
  const phoneNumber = await prisma.calAiPhoneNumber.findFirst({
    where: {
      stripeSubscriptionId: subscription.id,
    },
  });

  if (phoneNumber) {
    return await handlePhoneNumberSubscriptionDeleted(subscription, phoneNumber);
  }

  // Fall back to product-based handling for other subscriptions
  let productId: string | null = null;
  // @ts-expect-error - support legacy just in case.
  if (subscription.plan) {
    // @ts-expect-error - we know subscription.plan.product is defined when unsubscribing
    productId = subscription.plan.product; // prod_xxxxx
  } else {
    const subscriptionItem = subscription.items?.data?.[0];
    if (!subscriptionItem) {
      throw new Error("Subscription item and plan missing");
    }
    const product = subscription.items.data[0]?.plan.product;
    if (product) {
      productId = typeof product === "string" ? product : product.id;
    }
  }
  if (typeof productId !== "string") {
    throw new Error(`Unable to determine Product ID from subscription: ${subscription.id}`);
  }
  const handlerGetter = handlers[productId as any];
  if (!handlerGetter) {
    console.log("No product handler found for product", productId);
    return {
      success: false,
      message: `No product handler found for product: ${productId}`,
    };
  }
  const handler = (await handlerGetter())?.default;
  // auto catch unsupported Stripe products.
  if (!handler) {
    console.log("No product handler found for product", productId);
    return {
      success: false,
      message: `No product handler found for product: ${productId}`,
    };
  }
  return await handler(data);
};

async function handlePhoneNumberSubscriptionDeleted(subscription: any, phoneNumber: any) {
  if (!subscription.id) {
    throw new HttpCode(400, "Subscription ID not found");
  }

  // Mark subscription as cancelled and remove from AI config if linked
  await prisma.calAiPhoneNumber.update({
    where: {
      id: phoneNumber.id,
    },
    data: {
      subscriptionStatus: PhoneNumberSubscriptionStatus.CANCELLED,
    },
  });

  // Remove phone number from AI configurations
  await prisma.aISelfServeConfiguration.updateMany({
    where: {
      yourPhoneNumberId: phoneNumber.id,
    },
    data: {
      yourPhoneNumberId: null,
    },
  });

  return { success: true, subscriptionId: subscription.id };
}

export default stripeWebhookProductHandler({
  [STRIPE_TEAM_PRODUCT_ID]: () => import("./_customer.subscription.deleted.team-plan"),
});
