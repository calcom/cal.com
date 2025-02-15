import { z } from "zod";

import { createOrganizationFromOnboarding } from "@calcom/features/ee/organizations/lib/server/createOrganizationFromOnboarding";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";

import type { SWHMap } from "./__handler";

const invoicePaidSchema = z.object({
  object: z.object({
    customer: z.string(),
    subscription: z.string(),
  }),
});

const handler = async (data: SWHMap["invoice.paid"]["data"]) => {
  const { object: invoice } = invoicePaidSchema.parse(data);
  logger.debug(
    `Processing invoice paid webhook for customer ${invoice.customer} and subscription ${invoice.subscription}`
  );

  const organizationOnboarding = await OrganizationOnboardingRepository.findByStripeCustomerId(
    invoice.customer
  );
  if (!organizationOnboarding) {
    logger.error(
      `NonRecoverableError: No onboarding record found for stripe customer id: ${invoice.customer}.`
    );
    
    // Don't throw as we don't want to retry.
    return {
      success: false,
      error: `No onboarding record found for stripe customer id: ${invoice.customer}.`,
    };
  }

  try {
    const { organization } = await createOrganizationFromOnboarding({
      organizationOnboarding,
      paymentSubscriptionId: invoice.subscription,
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
