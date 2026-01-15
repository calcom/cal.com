import { z } from "zod";

import { getBillingProviderService } from "@calcom/ee/billing/di/containers/Billing";
import { Plan, SubscriptionStatus } from "@calcom/features/ee/billing/repository/billing/IBillingRepository";
import { BillingEnabledOrgOnboardingService } from "@calcom/features/ee/organizations/lib/service/onboarding/BillingEnabledOrgOnboardingService";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { OrganizationOnboardingRepository } from "@calcom/features/organizations/repositories/OrganizationOnboardingRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";

import { getTeamBillingServiceFactory } from "../../di/containers/Billing";
import type { SWHMap } from "./__handler";

const invoicePaidSchema = z.object({
  object: z.object({
    customer: z.string(),
    subscription: z.string(),
    lines: z.object({
      data: z.array(
        z.object({
          subscription_item: z.string(),
        })
      ),
    }),
  }),
});

async function handlePaymentReceivedForOnboarding({
  organizationOnboarding,
  paymentSubscriptionId,
  paymentSubscriptionItemId,
}: {
  organizationOnboarding: { id: string };
  paymentSubscriptionId: string;
  paymentSubscriptionItemId: string;
}) {
  await OrganizationOnboardingRepository.update(organizationOnboarding.id, {
    stripeSubscriptionId: paymentSubscriptionId,
    stripeSubscriptionItemId: paymentSubscriptionItemId,
  });
}

const handler = async (data: SWHMap["invoice.paid"]["data"]) => {
  const { object: invoice } = invoicePaidSchema.parse(data);
  const subscriptionItemId = invoice.lines.data[0]?.subscription_item;
  const subscriptionId = invoice.subscription;
  logger.debug(
    `Processing invoice paid webhook for customer ${invoice.customer} and subscription ${invoice.subscription}`
  );

  const organizationOnboarding = await OrganizationOnboardingRepository.findByStripeCustomerId(
    invoice.customer
  );

  if (!organizationOnboarding) {
    // Invoice Paid is received for all organizations, even those that were created before Organization Onboarding was introduced.
    logger.info(
      `No onboarding record found for stripe customer id: ${invoice.customer}, Organization created before Organization Onboarding was introduced, so ignoring the webhook`
    );

    return {
      success: true,
    };
  }

  const paymentSubscriptionId = subscriptionId;
  const paymentSubscriptionItemId = subscriptionItemId;

  await handlePaymentReceivedForOnboarding({
    organizationOnboarding,
    paymentSubscriptionId,
    paymentSubscriptionItemId,
  });

  try {
    logger.info(
      safeStringify({
        orgId: organizationOnboarding.organizationId,
        orgSlug: organizationOnboarding.slug,
        isDomainConfigured: organizationOnboarding.isDomainConfigured,
        createdAt: organizationOnboarding.createdAt,
        stripeSubscriptionId: organizationOnboarding.stripeSubscriptionId,
      })
    );

    if (organizationOnboarding.isComplete) {
      // If the organization is already complete, there is nothing to do
      // Repeat requests can come for recurring payments
      return {
        success: true,
        message: "Onboarding already completed, skipping",
      };
    }

    // Get the user who created the onboarding (for service instantiation)
    const userRepo = new UserRepository(prisma);
    const creator = organizationOnboarding.createdById
      ? await userRepo.findById({ id: organizationOnboarding.createdById })
      : null;

    // Create a minimal user context for the service
    // If no creator, use a system user context (webhook is system-initiated)
    const userContext = creator
      ? {
          id: creator.id,
          email: creator.email,
          role: "ADMIN" as const,
          name: creator.name || undefined,
        }
      : {
          id: 0, // System user
          email: organizationOnboarding.orgOwnerEmail,
          role: "ADMIN" as const,
        };

    const onboardingService = new BillingEnabledOrgOnboardingService(userContext);
    const { organization } = await onboardingService.createOrganization(organizationOnboarding, {
      subscriptionId: paymentSubscriptionId,
      subscriptionItemId: paymentSubscriptionItemId,
    });

    // Get the Stripe subscription object
    const stripeSubscription = await stripe.subscriptions.retrieve(paymentSubscriptionId);
    const billingService = getBillingProviderService();
    const { subscriptionStart } = billingService.extractSubscriptionDates(stripeSubscription);

    const teamBillingServiceFactory = getTeamBillingServiceFactory();
    const teamBillingService = teamBillingServiceFactory.init(organization);
    await teamBillingService.saveTeamBilling({
      teamId: organization.id,
      subscriptionId: paymentSubscriptionId,
      subscriptionItemId: paymentSubscriptionItemId,
      customerId: invoice.customer,
      // TODO: Write actual status when webhook events are added
      status: SubscriptionStatus.ACTIVE,
      planName: Plan.ORGANIZATION,
      subscriptionStart,
    });

    logger.debug(`Marking onboarding as complete for organization ${organization.id}`);
    await OrganizationOnboardingRepository.markAsComplete(organizationOnboarding.id);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      await OrganizationOnboardingRepository.update(organizationOnboarding.id, {
        error: error.message,
      });
    }
    logger.error(
      `Error creating organization from onboarding:${organizationOnboarding.id}`,
      safeStringify({ error: error instanceof Error ? error.message : error })
    );
    throw error;
  }
};

export default handler;
