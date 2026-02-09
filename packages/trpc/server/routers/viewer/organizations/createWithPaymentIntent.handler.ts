/**
 * @deprecated This endpoint is deprecated. Use `intentToCreateOrg` instead, which now handles
 * teams and invites in a single mutation call. This endpoint will be removed in a future release.
 *
 * Migration guide:
 * - Instead of calling `intentToCreateOrg` followed by `createWithPaymentIntent`,
 *   pass teams and invitedMembers directly to `intentToCreateOrg`
 * - The new endpoint returns checkoutUrl directly in the response
 */
import { OrganizationPaymentService } from "@calcom/features/ee/organizations/lib/OrganizationPaymentService";
import { OrganizationOnboardingRepository } from "@calcom/features/organizations/repositories/OrganizationOnboardingRepository";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

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

/**
 * @deprecated Use intentToCreateOrg with teams and invitedMembers instead
 */
export const createHandler = async ({ input, ctx }: CreateOptions) => {
  log.warn(
    "DEPRECATED: createWithPaymentIntent is deprecated. Use intentToCreateOrg with teams and invitedMembers instead."
  );
  const paymentService = new OrganizationPaymentService({
    id: ctx.user.id,
    email: ctx.user.email,
    role: ctx.user.role,
    name: ctx.user.name ?? undefined,
  });
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
      brandColor: input.brandColor ?? null,
      bannerUrl: input.bannerUrl ?? null,
    },
    organizationOnboarding
  );

  return {
    checkoutUrl: paymentIntent.checkoutUrl,
  };
};

export default createHandler;
