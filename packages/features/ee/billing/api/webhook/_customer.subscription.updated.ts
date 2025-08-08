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
    select: {
      id: true,
      phoneNumber: true,
    },
  });

  if (!phoneNumber) {
    throw new HttpCode(202, "Phone number not found");
  }

  return await handlePhoneNumberSubscriptionUpdate(subscription, phoneNumber);
};

type Subscription = Data["object"];

async function handlePhoneNumberSubscriptionUpdate(
  subscription: Subscription,
  phoneNumber: { id: number; phoneNumber: string }
) {
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
