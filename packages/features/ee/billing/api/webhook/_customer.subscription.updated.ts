import { PrismaPhoneNumberRepository } from "@calcom/features/calAIPhone/repositories/PrismaPhoneNumberRepository";
import prisma from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import type { SWHMap } from "./__handler";
import { HttpCode } from "./__handler";

type Data = SWHMap["customer.subscription.updated"]["data"];

const handler = async (data: Data) => {
  const subscription = data.object;
  const previousAttributes = data.previous_attributes;

  if (!subscription.id) {
    throw new HttpCode(400, "Subscription ID not found");
  }

  // Handle phone number subscription updates
  const phoneNumberRepo = new PrismaPhoneNumberRepository(prisma);
  const phoneNumber = await phoneNumberRepo.findByStripeSubscriptionId({
    stripeSubscriptionId: subscription.id,
  });

  let phoneNumberResult = null;
  if (phoneNumber) {
    phoneNumberResult = await handleCalAIPhoneNumberSubscriptionUpdate(subscription, phoneNumber);
  }

  // Handle team billing renewal (reset paidSeats on renewal)
  const teamBillingResult = await handleTeamBillingRenewal(subscription, previousAttributes);

  return {
    phoneNumber: phoneNumberResult,
    teamBilling: teamBillingResult,
  };
};

type Subscription = Data["object"];

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

async function handleTeamBillingRenewal(subscription: Subscription, previousAttributes: any) {
  // Detect renewal: current_period_start changed
  if (!previousAttributes?.current_period_start) {
    return { skipped: true, reason: "not a renewal" };
  }

  const paidSeats = subscription.items.data[0]?.quantity || 0;
  const subscriptionStart = new Date(subscription.current_period_start * 1000);
  const subscriptionEnd = new Date(subscription.current_period_end * 1000);

  // Try team billing first
  const teamBilling = await prisma.teamBilling.findUnique({
    where: { subscriptionId: subscription.id },
  });

  if (teamBilling) {
    await prisma.teamBilling.update({
      where: { id: teamBilling.id },
      data: {
        paidSeats,
        subscriptionStart,
        subscriptionEnd,
      },
    });
    return { success: true, type: "team", teamId: teamBilling.teamId };
  }

  // Try organization billing
  const orgBilling = await prisma.organizationBilling.findUnique({
    where: { subscriptionId: subscription.id },
  });

  if (orgBilling) {
    await prisma.organizationBilling.update({
      where: { id: orgBilling.id },
      data: {
        paidSeats,
        subscriptionStart,
        subscriptionEnd,
      },
    });
    return { success: true, type: "organization", teamId: orgBilling.teamId };
  }

  return { skipped: true, reason: "no billing record found" };
}

export default handler;
