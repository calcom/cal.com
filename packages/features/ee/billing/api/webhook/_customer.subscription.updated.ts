import { prisma } from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/client";

import type { SWHMap } from "./__handler";
import { HttpCode } from "./__handler";

type Data = SWHMap["customer.subscription.updated"]["data"];

const handler = async (data: Data) => {
  const subscription = data.object;

  if (!subscription.id) {
    throw new HttpCode(400, "Subscription ID not found");
  }

  // Check if this is a phone number subscription first
  const phoneNumber = await prisma.calAiPhoneNumber.findFirst({
    where: {
      stripeSubscriptionId: subscription.id,
    },
  });

  if (phoneNumber) {
    return await handlePhoneNumberSubscriptionUpdate(subscription, phoneNumber);
  }

  // Fall back to handling regular app subscriptions
  const app = await prisma.credential.findFirst({
    where: {
      subscriptionId: subscription.id,
    },
  });

  if (!app) {
    throw new HttpCode(202, "Subscription not found");
  }

  await prisma.credential.update({
    where: {
      id: app.id,
    },
    data: {
      paymentStatus: subscription.status,
    },
  });

  return { success: true, subscriptionId: subscription.id };
};

async function handlePhoneNumberSubscriptionUpdate(subscription: any, phoneNumber: any) {
  // Map Stripe subscription status to our enum
  const statusMap: Record<string, PhoneNumberSubscriptionStatus> = {
    active: PhoneNumberSubscriptionStatus.ACTIVE,
    past_due: PhoneNumberSubscriptionStatus.PAST_DUE,
    cancelled: PhoneNumberSubscriptionStatus.CANCELLED,
    incomplete: PhoneNumberSubscriptionStatus.INCOMPLETE,
    incomplete_expired: PhoneNumberSubscriptionStatus.INCOMPLETE_EXPIRED,
    trialing: PhoneNumberSubscriptionStatus.TRIALING,
    unpaid: PhoneNumberSubscriptionStatus.UNPAID,
  };

  const subscriptionStatus = statusMap[subscription.status] || PhoneNumberSubscriptionStatus.UNPAID;

  await prisma.calAiPhoneNumber.update({
    where: {
      id: phoneNumber.id,
    },
    data: {
      subscriptionStatus,
    },
  });

  return { success: true, subscriptionId: subscription.id, status: subscriptionStatus };
}

export default handler;
