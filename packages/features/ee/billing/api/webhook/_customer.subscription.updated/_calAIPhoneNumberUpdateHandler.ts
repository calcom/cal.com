import { PrismaPhoneNumberRepository } from "@calcom/features/calAIPhone/repositories/PrismaPhoneNumberRepository";
import prisma from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import { HttpCode } from "../../../lib/httpCode";
import type { SWHMap } from "../../../lib/types";

type Data = SWHMap["customer.subscription.updated"]["data"];
type Subscription = Data["object"];

const handler = async (data: Data & { productId: string }) => {
  const subscription = data.object;

  if (!subscription.id) {
    throw new HttpCode(400, "Subscription ID not found");
  }

  const phoneNumberRepo = new PrismaPhoneNumberRepository(prisma);
  const phoneNumber = await phoneNumberRepo.findByStripeSubscriptionId({
    stripeSubscriptionId: subscription.id,
  });

  if (!phoneNumber) {
    return { success: false, subscriptionId: subscription.id, message: "Phone number not found" };
  }

  return await handleCalAIPhoneNumberSubscriptionUpdate(subscription, phoneNumber);
};

async function handleCalAIPhoneNumberSubscriptionUpdate(
  subscription: Subscription,
  phoneNumber: { id: number; phoneNumber: string }
) {
  // Map Stripe subscription status to our enum
  const statusMap: Record<string, PhoneNumberSubscriptionStatus> = {
    active: PhoneNumberSubscriptionStatus.ACTIVE,
    past_due: PhoneNumberSubscriptionStatus.PAST_DUE,
    canceled: PhoneNumberSubscriptionStatus.CANCELLED,
    incomplete: PhoneNumberSubscriptionStatus.INCOMPLETE,
    incomplete_expired: PhoneNumberSubscriptionStatus.INCOMPLETE_EXPIRED,
    trialing: PhoneNumberSubscriptionStatus.TRIALING,
    unpaid: PhoneNumberSubscriptionStatus.UNPAID,
    paused: PhoneNumberSubscriptionStatus.CANCELLED,
  };

  const subscriptionStatus =
    statusMap[subscription.status] || PhoneNumberSubscriptionStatus.UNPAID;

  await prisma.calAiPhoneNumber.update({
    where: {
      id: phoneNumber.id,
    },
    data: {
      subscriptionStatus,
    },
  });

  return {
    success: true,
    subscriptionId: subscription.id,
    status: subscriptionStatus,
  };
}

export default handler;
