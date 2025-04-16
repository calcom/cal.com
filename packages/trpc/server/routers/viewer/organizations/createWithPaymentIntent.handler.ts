import { OrganizationPaymentService } from "@calcom/features/ee/organizations/lib/OrganizationPaymentService";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TCreateWithPaymentIntentInputSchema } from "./createWithPaymentIntent.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateWithPaymentIntentInputSchema;
};
const log = logger.getSubLogger({ prefix: ["viewer", "organizations", "createWithPaymentIntent"] });
export const createHandler = async ({ input, ctx }: CreateOptions) => {
  const paymentService = new OrganizationPaymentService(ctx.user);
  const isAdmin = ctx.user.role === "ADMIN";
  // Regular user can send onboardingId if the onboarding was started by ADMIN/someone else and they shared the link with them.
  // ADMIN flow doesn't send onboardingId
  const organizationOnboarding = await OrganizationOnboardingRepository.findById(input.onboardingId);

  if (!organizationOnboarding) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "organization_onboarding_not_found",
    });
  }

  if (organizationOnboarding.stripeSubscriptionId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "organization_has_subscription_already",
    });
  }

  if (!isAdmin && organizationOnboarding.orgOwnerEmail !== ctx.user.email) {
    log.warn(
      "Organization onboarding there but not have access",
      safeStringify({
        orgOwnerEmail: organizationOnboarding?.orgOwnerEmail,
        userEmail: ctx.user.email,
      })
    );

    // Intentionally throw vague error to avoid leaking information
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "organization_onboarding_not_found",
    });
  }

  const paymentIntent = await paymentService.createPaymentIntent(
    {
      ...input,
      logo: input.logo ?? null,
      bio: input.bio ?? null,
    },
    organizationOnboarding
  );

  return {
    checkoutUrl: paymentIntent.checkoutUrl,
  };
};

export default createHandler;
