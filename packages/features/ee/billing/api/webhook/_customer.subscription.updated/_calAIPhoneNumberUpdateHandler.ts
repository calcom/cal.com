import { PrismaPhoneNumberRepository } from "@calcom/lib/server/repository/PrismaPhoneNumberRepository";
import { prisma } from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import { HttpCode } from "../../../lib/httpCode";
import type { SWHMap } from "../../../lib/types";

const handler = async (data: SWHMap["customer.subscription.updated"]["data"] & { productId: string }) => {
  const subscription = data.object;
  const phoneNumberRepo = new PrismaPhoneNumberRepository(prisma);
  const phoneNumber = await phoneNumberRepo.findByStripeSubscriptionId({
    stripeSubscriptionId: subscription.id,
  });

  if (!phoneNumber) {
    throw new HttpCode(202, "Phone number not found");
  }

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
};

export default handler;
