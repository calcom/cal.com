import { SelfHostedOrganizationOnboardingService } from "@calcom/features/ee/organizations/lib/service/onboarding/SelfHostedOnboardingService";
import { OrganizationOnboardingRepository } from "@calcom/features/organizations/repositories/OrganizationOnboardingRepository";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TCreateSelfHostedInputSchema } from "./createSelfHosted.schema";

type CreateSelfHostedOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateSelfHostedInputSchema;
};

export const createSelfHostedHandler = async ({ input, ctx }: CreateSelfHostedOptions) => {
  if (!IS_SELF_HOSTED) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Self-hosted is not enabled",
    });
  }

  if (!input.onboardingId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "onboardingId is required",
    });
  }

  const organizationOnboarding = await OrganizationOnboardingRepository.findById(input.onboardingId);

  if (!organizationOnboarding) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Organization onboarding not found",
    });
  }

  if (!organizationOnboarding.orgOwnerEmail) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Organization owner email not found",
    });
  }

  const userContext = {
    id: ctx.user.id,
    email: ctx.user.email,
    role: ctx.user.role as "ADMIN" | "USER",
    name: ctx.user.name || undefined,
  };

  const onboardingService = new SelfHostedOrganizationOnboardingService(userContext);
  const { organization } = await onboardingService.createOrganization({
    id: input.onboardingId,
    logo: input.logo ?? null,
    bio: input.bio ?? null,
    brandColor: input.brandColor ?? null,
    bannerUrl: input.bannerUrl ?? null,
    invitedMembers: input.invitedMembers ?? [],
    teams: input.teams ?? [],
    orgOwnerEmail: organizationOnboarding.orgOwnerEmail,
    slug: organizationOnboarding.slug,
    name: organizationOnboarding.name,
    billingPeriod: organizationOnboarding.billingPeriod,
    seats: organizationOnboarding.seats,
    pricePerSeat: organizationOnboarding.pricePerSeat,
    stripeCustomerId: organizationOnboarding.stripeCustomerId,
    isPlatform: organizationOnboarding.isPlatform,
    isDomainConfigured: organizationOnboarding.isDomainConfigured,
    organizationId: organizationOnboarding.organizationId,
  });

  await OrganizationOnboardingRepository.markAsComplete(organizationOnboarding.id);

  return {
    organization,
  };
};

export default createSelfHostedHandler;
