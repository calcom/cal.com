import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";
import type { BillingPeriod, CreationSource } from "@calcom/prisma/enums";
import { UserPermissionRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { OrganizationPaymentService } from "./OrganizationPaymentService";
import { OrganizationPermissionService } from "./OrganizationPermissionService";

const log = logger.getSubLogger({ prefix: ["OrganizationOnboardingService"] });

type TeamInput = {
  id: number;
  name: string;
  isBeingMigrated: boolean;
  slug: string | null;
};

type InvitedMemberInput = {
  email: string;
  name?: string;
};

export type CreateOnboardingIntentInput = {
  name: string;
  slug: string;
  orgOwnerEmail: string;
  seats?: number | null;
  pricePerSeat?: number | null;
  billingPeriod?: BillingPeriod;
  isPlatform: boolean;
  creationSource: CreationSource;
  logo?: string | null;
  bio?: string | null;
  brandColor?: string | null;
  bannerUrl?: string | null;
  teams?: TeamInput[];
  invitedMembers?: InvitedMemberInput[];
};

export type OnboardingIntentResult = {
  userId: number;
  orgOwnerEmail: string;
  name: string;
  slug: string;
  seats: number | null;
  pricePerSeat: number | null;
  billingPeriod?: BillingPeriod;
  isPlatform: boolean;
  organizationOnboardingId: string;
  checkoutUrl: string | null;
};

export class OrganizationOnboardingService {
  protected paymentService: OrganizationPaymentService;
  protected permissionService: OrganizationPermissionService;
  protected user: NonNullable<TrpcSessionUser>;

  constructor(
    user: NonNullable<TrpcSessionUser>,
    paymentService?: OrganizationPaymentService,
    permissionService?: OrganizationPermissionService
  ) {
    this.user = user;
    this.paymentService = paymentService || new OrganizationPaymentService(user);
    this.permissionService = permissionService || new OrganizationPermissionService(user);
  }

  async createOnboardingIntent(input: CreateOnboardingIntentInput): Promise<OnboardingIntentResult> {
    const {
      slug,
      name,
      orgOwnerEmail,
      seats,
      pricePerSeat,
      billingPeriod,
      isPlatform,
      logo,
      bio,
      brandColor,
      bannerUrl,
      teams = [],
      invitedMembers = [],
    } = input;

    log.debug(
      "Starting organization onboarding intent creation",
      safeStringify({
        slug,
        name,
        orgOwnerEmail,
        isPlatform,
        teamsCount: teams.length,
        invitesCount: invitedMembers.length,
      })
    );

    // Create the organization onboarding record (validates permissions and creates record)
    const organizationOnboarding = await this.paymentService.createOrganizationOnboarding({
      name,
      slug,
      orgOwnerEmail,
      seats,
      pricePerSeat,
      billingPeriod,
      createdByUserId: this.user.id,
      logo: logo ?? null,
      bio: bio ?? null,
      brandColor: brandColor ?? null,
      bannerUrl: bannerUrl ?? null,
    });

    const onboardingId = organizationOnboarding.id;

    log.debug("Organization onboarding created", safeStringify({ onboardingId }));

    // Filter out empty teams and invites
    const teamsData = teams
      .filter((team) => team.name.trim().length > 0)
      .map((team) => ({
        id: team.id === -1 ? -1 : team.id, // -1 indicates new team
        name: team.name,
        isBeingMigrated: team.isBeingMigrated,
        slug: team.slug,
      }));

    const invitedMembersData = invitedMembers
      .filter((invite) => invite.email.trim().length > 0)
      .map((invite) => ({
        email: invite.email,
        name: invite.name,
      }));

    // If admin user, skip payment flow
    if (this.user.role === UserPermissionRole.ADMIN) {
      log.debug("Admin flow, skipping payment", safeStringify({ onboardingId }));

      // Store teams and invites in onboarding record for later processing
      if (teamsData.length > 0 || invitedMembersData.length > 0) {
        await OrganizationOnboardingRepository.update(onboardingId, {
          teams: teamsData,
          invitedMembers: invitedMembersData,
        });
      }

      return {
        userId: this.user.id,
        orgOwnerEmail,
        name,
        slug,
        seats: seats ?? null,
        pricePerSeat: pricePerSeat ?? null,
        billingPeriod,
        isPlatform,
        organizationOnboardingId: onboardingId,
        checkoutUrl: null,
      };
    }

    // Regular user flow: create payment intent
    log.debug("Creating payment intent for regular user", safeStringify({ onboardingId }));

    const paymentIntent = await this.paymentService.createPaymentIntent(
      {
        logo: logo ?? null,
        bio: bio ?? null,
        brandColor: brandColor ?? null,
        bannerUrl: bannerUrl ?? null,
        teams: teamsData,
        invitedMembers: invitedMembersData,
      },
      {
        id: organizationOnboarding.id,
        pricePerSeat: organizationOnboarding.pricePerSeat,
        billingPeriod: organizationOnboarding.billingPeriod,
        seats: organizationOnboarding.seats,
        isComplete: organizationOnboarding.isComplete,
        orgOwnerEmail: organizationOnboarding.orgOwnerEmail,
        slug: organizationOnboarding.slug,
        stripeCustomerId: organizationOnboarding.stripeCustomerId,
      }
    );

    log.debug(
      "Payment intent created",
      safeStringify({ onboardingId, checkoutUrl: paymentIntent.checkoutUrl })
    );

    return {
      userId: this.user.id,
      orgOwnerEmail,
      name,
      slug,
      seats: seats ?? null,
      pricePerSeat: pricePerSeat ?? null,
      billingPeriod,
      isPlatform,
      organizationOnboardingId: onboardingId,
      checkoutUrl: paymentIntent.checkoutUrl,
    };
  }
}
