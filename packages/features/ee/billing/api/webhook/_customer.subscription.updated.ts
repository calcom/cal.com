import { getBillingProviderService } from "@calcom/ee/billing/di/containers/Billing";
import { PrismaPhoneNumberRepository } from "@calcom/features/calAIPhone/repositories/PrismaPhoneNumberRepository";
import { extractBillingDataFromStripeSubscription } from "@calcom/features/ee/billing/lib/stripe-subscription-utils";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
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

  const phoneNumberRepo = new PrismaPhoneNumberRepository(prisma);
  const phoneNumber = await phoneNumberRepo.findByStripeSubscriptionId({
    stripeSubscriptionId: subscription.id,
  });

  const phoneNumberResult = phoneNumber
    ? await handleCalAIPhoneNumberSubscriptionUpdate(subscription, phoneNumber)
    : null;

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

async function handleTeamBillingRenewal(
  subscription: Subscription,
  previousAttributes: Data["previous_attributes"]
) {
  if (!previousAttributes?.current_period_start) {
    return { skipped: true, reason: "not a renewal" };
  }

  const billingProviderService = getBillingProviderService();
  const { subscriptionStart, subscriptionEnd, subscriptionTrialEnd } =
    billingProviderService.extractSubscriptionDates(subscription);

  const { billingPeriod, pricePerSeat, paidSeats } = extractBillingDataFromStripeSubscription(subscription);

  const teamBilling = await prisma.teamBilling.findUnique({
    where: { subscriptionId: subscription.id },
  });

  if (teamBilling) {
    const teamBillingUpdate = {
      paidSeats: paidSeats ?? null,
      subscriptionStart,
      subscriptionEnd,
      subscriptionTrialEnd,
      billingPeriod,
      pricePerSeat: pricePerSeat ?? null,
    } as Prisma.TeamBillingUpdateInput;

    await prisma.teamBilling.update({
      where: { id: teamBilling.id },
      data: teamBillingUpdate,
    });
    return { success: true, type: "team", teamId: teamBilling.teamId };
  }

  const orgBilling = await prisma.organizationBilling.findUnique({
    where: { subscriptionId: subscription.id },
  });

  if (orgBilling) {
    const organizationBillingUpdate = {
      paidSeats: paidSeats ?? null,
      subscriptionStart,
      subscriptionEnd,
      subscriptionTrialEnd,
      billingPeriod,
      pricePerSeat: pricePerSeat ?? null,
    } as Prisma.OrganizationBillingUpdateInput;

    await prisma.organizationBilling.update({
      where: { id: orgBilling.id },
      data: organizationBillingUpdate,
    });
    return { success: true, type: "organization", teamId: orgBilling.teamId };
  }

  return { skipped: true, reason: "no billing record found" };
}

export default handler;
