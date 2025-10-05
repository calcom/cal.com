import { createOrganizationFromOnboarding } from "@calcom/features/ee/organizations/lib/server/createOrganizationFromOnboarding";
import { IS_STRIPE_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import { OrganizationPaymentService } from "./OrganizationPaymentService";

const log = logger.getSubLogger({ prefix: ["OrganizationOnboardingService"] });

type OnboardingInput = {
  plan?: "personal" | "team" | "organization";
  organization: {
    name: string;
    link: string;
    bio: string;
  };
  brand: {
    color: string;
    logo: string | null;
    banner: string | null;
  };
  teams: { id: number; isBeingMigrated: boolean; slug: string | null; name: string }[];
  invites: { email: string; team: string; role: "member" | "admin" }[];
  inviteRole: "member" | "admin";
  onboardingId: string;
};

type OnboardingResult =
  | {
      requiresPayment: true;
      checkoutUrl: string | null;
      sessionId: string | null;
    }
  | {
      requiresPayment: false;
      organization: {
        id: number;
        name: string;
        slug: string | null;
      };
    };

export class OrganizationOnboardingService {
  protected user: NonNullable<TrpcSessionUser>;
  protected paymentService: OrganizationPaymentService;

  constructor(user: NonNullable<TrpcSessionUser>) {
    this.user = user;
    this.paymentService = new OrganizationPaymentService(user);
  }

  async processOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
    log.debug("Processing onboarding", safeStringify({ userId: this.user.id, input }));

    // Get the existing onboarding record
    const organizationOnboarding = await OrganizationOnboardingRepository.findById(input.onboardingId);

    if (!organizationOnboarding) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "organization_onboarding_not_found",
      });
    }

    // Check if user has access to this onboarding
    if (organizationOnboarding.orgOwnerEmail !== this.user.email && this.user.role !== "ADMIN") {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You do not have permission to access this onboarding",
      });
    }

    // Convert invites to the expected format
    const invitedMembers = input.invites.map((invite) => ({
      email: invite.email,
    }));

    if (IS_STRIPE_ENABLED) {
      log.debug("Stripe is enabled, creating payment intent");

      // Update onboarding record with brand data first
      await OrganizationOnboardingRepository.update(organizationOnboarding.id, {
        logo: input.brand.logo,
        bio: input.organization.bio,
        brandColor: input.brand.color,
        bannerUrl: input.brand.banner,
        teams: input.teams,
        invitedMembers,
      });

      // Refetch to get the updated record
      const updatedOnboarding = await OrganizationOnboardingRepository.findById(organizationOnboarding.id);
      if (!updatedOnboarding) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update onboarding record",
        });
      }

      // Create payment intent
      const paymentIntent = await this.paymentService.createPaymentIntent(
        {
          logo: input.brand.logo,
          bio: input.organization.bio,
          teams: input.teams,
          invitedMembers,
        },
        updatedOnboarding
      );

      return {
        requiresPayment: true,
        checkoutUrl: paymentIntent.checkoutUrl,
        sessionId: paymentIntent.sessionId,
      };
    } else {
      log.debug("Stripe is disabled, creating organization immediately");

      // Update onboarding record with the data from frontend
      await OrganizationOnboardingRepository.update(organizationOnboarding.id, {
        logo: input.brand.logo,
        bio: input.organization.bio,
        brandColor: input.brand.color,
        bannerUrl: input.brand.banner,
        teams: input.teams,
        invitedMembers,
      });

      // Create organization immediately (self-hosted without Stripe)
      const { organization } = await createOrganizationFromOnboarding({
        organizationOnboarding: {
          ...organizationOnboarding,
          logo: input.brand.logo,
          bio: input.organization.bio,
          brandColor: input.brand.color,
          bannerUrl: input.brand.banner,
          teams: input.teams,
          invitedMembers,
        },
      });

      // Mark onboarding as complete
      await OrganizationOnboardingRepository.markAsComplete(organizationOnboarding.id);

      return {
        requiresPayment: false,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
      };
    }
  }
}
