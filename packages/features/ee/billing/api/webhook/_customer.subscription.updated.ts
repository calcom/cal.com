import { getBillingProviderService } from "@calcom/ee/billing/di/containers/Billing";
import { PrismaPhoneNumberRepository } from "@calcom/features/calAIPhone/repositories/PrismaPhoneNumberRepository";
import { PrismaOrganizationBillingRepository } from "@calcom/features/ee/billing/repository/billing/PrismaOrganizationBillingRepository";
import { PrismaTeamBillingRepository } from "@calcom/features/ee/billing/repository/billing/PrismaTeamBillingRepository";
import { extractBillingDataFromStripeSubscription } from "@calcom/features/ee/billing/lib/stripe-subscription-utils";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["subscription-updated-webhook"] });

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

  const teamBillingResult = await handleTeamBillingRenewal(
    subscription,
    previousAttributes
  );

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

  const { billingPeriod, pricePerSeat, paidSeats } =
    extractBillingDataFromStripeSubscription(subscription);

  const teamBillingRepo = new PrismaTeamBillingRepository(prisma);
  const orgBillingRepo = new PrismaOrganizationBillingRepository(prisma);

  const billingUpdateData = {
    paidSeats: paidSeats ?? null,
    subscriptionStart,
    subscriptionEnd,
    subscriptionTrialEnd,
    billingPeriod,
    pricePerSeat: pricePerSeat ?? null,
  };

  const teamBilling = await teamBillingRepo.findBySubscriptionId(
    subscription.id
  );

  if (teamBilling) {
    await teamBillingRepo.updateById(teamBilling.id, billingUpdateData);
    return { success: true, type: "team", teamId: teamBilling.teamId };
  }

  const orgBilling = await orgBillingRepo.findBySubscriptionId(subscription.id);

  if (orgBilling) {
    await orgBillingRepo.updateById(orgBilling.id, billingUpdateData);
    return { success: true, type: "organization", teamId: orgBilling.teamId };
  }

  log.warn("Subscription renewal received but no billing record found", {
    subscriptionId: subscription.id,
    customerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id,
  });

  return { skipped: true, reason: "no billing record found" };
}

export default handler;
