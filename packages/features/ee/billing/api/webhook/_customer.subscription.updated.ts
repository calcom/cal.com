import { getBillingProviderService } from "@calcom/ee/billing/di/containers/Billing";
import { extractBillingDataFromStripeSubscription } from "@calcom/features/ee/billing/lib/stripe-subscription-utils";
import { PrismaOrganizationBillingRepository } from "@calcom/features/ee/billing/repository/billing/PrismaOrganizationBillingRepository";
import { PrismaTeamBillingRepository } from "@calcom/features/ee/billing/repository/billing/PrismaTeamBillingRepository";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

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

  const teamBillingResult = await handleTeamBillingRenewal(subscription, previousAttributes);

  return {
    teamBilling: teamBillingResult,
  };
};

type Subscription = Data["object"];

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

  const teamBilling = await teamBillingRepo.findBySubscriptionId(subscription.id);

  if (teamBilling) {
    await teamBillingRepo.updateById(teamBilling.id, billingUpdateData);
    // HWM reset is handled by invoice.paid webhook after payment completes
    return { success: true, type: "team", teamId: teamBilling.teamId };
  }

  const orgBilling = await orgBillingRepo.findBySubscriptionId(subscription.id);

  if (orgBilling) {
    await orgBillingRepo.updateById(orgBilling.id, billingUpdateData);
    // HWM reset is handled by invoice.paid webhook after payment completes
    return { success: true, type: "organization", teamId: orgBilling.teamId };
  }

  log.warn("Subscription renewal received but no billing record found", {
    subscriptionId: subscription.id,
    customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
  });

  return { skipped: true, reason: "no billing record found" };
}

export default handler;
