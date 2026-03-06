import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { PrismaPhoneNumberRepository } from "@calcom/features/calAIPhone/repositories/PrismaPhoneNumberRepository";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { LazyModule, SWHMap } from "./__handler";
import { HttpCode, productRouter } from "./__handler";

const log = logger.getSubLogger({ prefix: ["customer.subscription.deleted"] });

type Data = SWHMap["customer.subscription.deleted"]["data"];

const STRIPE_TEAM_PRODUCT_ID = process.env.STRIPE_TEAM_PRODUCT_ID || "";

function extractProductId(data: Data): string | null {
  const subscription = data.object;
  // @ts-expect-error - support legacy just in case.
  if (subscription.plan) {
    // @ts-expect-error - we know subscription.plan.product is defined when unsubscribing
    return subscription.plan.product as string;
  }
  const subscriptionItem = subscription.items?.data?.[0];
  if (!subscriptionItem) return null;
  const product = subscription.items.data[0]?.plan.product;
  if (!product) return null;
  return typeof product === "string" ? product : product.id;
}

const routeByProduct = productRouter<Data>(
  {
    [STRIPE_TEAM_PRODUCT_ID]: () => import("./_customer.subscription.deleted.team-plan"),
  },
  extractProductId
);

async function handleCalAIPhoneNumberSubscriptionDeleted(
  subscription: Data["object"],
  phoneNumber: NonNullable<Awaited<ReturnType<PrismaPhoneNumberRepository["findByStripeSubscriptionId"]>>>
) {
  if (!subscription.id) {
    throw new HttpCode(400, "Subscription ID not found");
  }
  if (!phoneNumber.userId) {
    throw new HttpCode(400, "Phone number does not belong to a user");
  }

  try {
    if (phoneNumber.subscriptionStatus === "CANCELLED") {
      return { success: true, subscriptionId: subscription.id, skipped: true };
    }

    const aiService = createDefaultAIPhoneServiceProvider();

    await aiService.cancelPhoneNumberSubscription({
      phoneNumberId: phoneNumber.id,
      userId: phoneNumber.userId,
      teamId: phoneNumber.teamId ?? undefined,
    });

    return { success: true, subscriptionId: subscription.id };
  } catch (error) {
    log.error("Failed to update phone number subscription", { error, subscriptionId: subscription.id });
    throw new HttpCode(500, "Failed to update phone number subscription");
  }
}

const handler = async (data: Data) => {
  const subscription = data.object;
  const phoneNumberRepo = new PrismaPhoneNumberRepository(prisma);

  // Phone number subscriptions don't have a product ID, so we check by subscription ID first
  const phoneNumber = await phoneNumberRepo.findByStripeSubscriptionId({
    stripeSubscriptionId: subscription.id,
  });

  if (phoneNumber) {
    return await handleCalAIPhoneNumberSubscriptionDeleted(subscription, phoneNumber);
  }

  return routeByProduct(data);
};

export default handler;
