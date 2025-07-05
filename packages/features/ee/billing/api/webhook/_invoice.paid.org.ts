import { Unkey } from "@unkey/api";
import { z } from "zod";

import { createOrganizationFromOnboarding } from "@calcom/features/ee/organizations/lib/server/createOrganizationFromOnboarding";
import logger from "@calcom/lib/logger";
import { API_KEY_RATE_LIMIT } from "@calcom/lib/rateLimit";
import { safeStringify } from "@calcom/lib/safeStringify";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";
import { prisma } from "@calcom/prisma";

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

async function increaseRatelimitForOrganizationOwner(orgOwnerEmail: string) {
  const { UNKEY_ROOT_KEY } = process.env;
  if (!UNKEY_ROOT_KEY) {
    logger.warn("UNKEY_ROOT_KEY is not set");
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: orgOwnerEmail },
    select: {
      id: true,
    },
  });
  if (!user) {
    logger.error(`User not found for email: ${orgOwnerEmail}`);
    return;
  }

  const unkeyClient = new Unkey({ rootKey: UNKEY_ROOT_KEY });

  const res = await unkeyClient.ratelimits.setOverride({
    identifier: user.id.toString(),
    limit: API_KEY_RATE_LIMIT * 2,
    duration: 60000,
    namespaceName: "api",
  });

  if (res.error) {
    logger.error(`Error increasing API ratelimit for user ${user.id}: ${res.error}`);
    return;
  }

  logger.info(`Increased API ratelimit for user ${user.id} to ${API_KEY_RATE_LIMIT * 2}`);
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

    const { organization } = await createOrganizationFromOnboarding({
      organizationOnboarding,
      paymentSubscriptionId,
      paymentSubscriptionItemId,
    });

    logger.debug(`Marking onboarding as complete for organization ${organization.id}`);
    await OrganizationOnboardingRepository.markAsComplete(organizationOnboarding.id);
    await increaseRatelimitForOrganizationOwner(organizationOnboarding.orgOwnerEmail);
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
