import { findUserToBeOrgOwner } from "@calcom/features/ee/organizations/lib/server/orgCreationUtils";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";
import type { Team, User } from "@calcom/prisma/client";
import {
  orgOnboardingInvitedMembersSchema,
  orgOnboardingTeamsSchema,
} from "@calcom/prisma/zod-utils";

import { BaseOnboardingService } from "./BaseOnboardingService";
import type {
  CreateOnboardingIntentInput,
  OnboardingIntentResult,
  OrganizationOnboardingData,
  OrganizationData,
} from "./types";

const log = logger.getSubLogger({ prefix: ["BillingEnabledOnboardingService"] });

const invitedMembersSchema = orgOnboardingInvitedMembersSchema;
const teamsSchema = orgOnboardingTeamsSchema;

/**
 * Handles organization onboarding when billing is enabled (Stripe flow).
 *
 * Flow:
 * 1. Create onboarding record
 * 2. Store teams/invites in database
 * 3. Create Stripe checkout session
 * 4. Return checkout URL
 * 5. Organization created later via Stripe webhook
 */
export class BillingEnabledOnboardingService extends BaseOnboardingService {
  async createOnboardingIntent(input: CreateOnboardingIntentInput): Promise<OnboardingIntentResult> {
    log.debug(
      "BillingEnabledOnboardingService.createOnboardingIntent - INPUT",
      safeStringify({
        invitedMembers: input.invitedMembers,
        teams: input.teams,
      })
    );

    const organizationOnboarding = await this.createOnboardingRecord(input);
    const onboardingId = organizationOnboarding.id;

    const { teamsData, invitedMembersData } = this.filterTeamsAndInvites(input.teams, input.invitedMembers);

    log.debug(
      "BillingEnabledOnboardingService - After filterTeamsAndInvites",
      safeStringify({
        teamsData,
        invitedMembersData,
      })
    );

    await OrganizationOnboardingRepository.update(onboardingId, {
      teams: teamsData,
      invitedMembers: invitedMembersData,
    });

    const paymentIntent = await this.paymentService.createPaymentIntent(
      {
        logo: input.logo ?? null,
        bio: input.bio ?? null,
        brandColor: input.brandColor ?? null,
        bannerUrl: input.bannerUrl ?? null,
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

    return {
      userId: this.user.id,
      orgOwnerEmail: input.orgOwnerEmail,
      name: input.name,
      slug: input.slug,
      seats: input.seats ?? null,
      pricePerSeat: input.pricePerSeat ?? null,
      billingPeriod: input.billingPeriod,
      isPlatform: input.isPlatform,
      organizationOnboardingId: onboardingId,
      checkoutUrl: paymentIntent.checkoutUrl,
      organizationId: null, // Organization not created yet (pending payment)
    };
  }

  async createOrganization(
    organizationOnboarding: OrganizationOnboardingData,
    paymentDetails?: { subscriptionId: string; subscriptionItemId: string }
  ): Promise<{ organization: Team; owner: User }> {
    log.info(
      "createOrganization (billing-enabled)",
      safeStringify({
        orgId: organizationOnboarding.organizationId,
        orgSlug: organizationOnboarding.slug,
      })
    );

    if (!IS_SELF_HOSTED && (!paymentDetails?.subscriptionId || !paymentDetails?.subscriptionItemId)) {
      throw new Error("payment_subscription_id_and_payment_subscription_item_id_are_required");
    }

    if (
      await this.hasConflictingOrganization({
        slug: organizationOnboarding.slug,
        onboardingId: organizationOnboarding.id,
      })
    ) {
      throw new Error("organization_already_exists_with_this_slug");
    }

    let owner = await findUserToBeOrgOwner(organizationOnboarding.orgOwnerEmail);
    const orgOwnerTranslation = await getTranslation(owner?.locale || "en", "common");

    if (!process.env.NEXT_PUBLIC_SINGLE_ORG_SLUG) {
      await this.handleDomainSetup({
        organizationOnboarding,
        orgOwnerTranslation,
      });
    }

    const orgData: OrganizationData = {
      id: organizationOnboarding.organizationId,
      name: organizationOnboarding.name,
      slug: organizationOnboarding.slug,
      isOrganizationConfigured: true,
      isOrganizationAdminReviewed: true,
      autoAcceptEmail: organizationOnboarding.orgOwnerEmail.split("@")[1],
      seats: organizationOnboarding.seats,
      pricePerSeat: organizationOnboarding.pricePerSeat,
      isPlatform: false,
      billingPeriod: organizationOnboarding.billingPeriod,
      logoUrl: organizationOnboarding.logo,
      bio: organizationOnboarding.bio,
      brandColor: organizationOnboarding.brandColor,
      bannerUrl: organizationOnboarding.bannerUrl,
    };

    let organization: Team;
    if (!owner) {
      const result = await this.createOrganizationWithNonExistentUserAsOwner({
        email: organizationOnboarding.orgOwnerEmail,
        orgData,
      });
      organization = result.organization;
      owner = result.owner;
    } else {
      const result = await this.createOrganizationWithExistingUserAsOwner({
        orgData,
        owner,
      });
      organization = result.organization;
    }

    if (organizationOnboarding.stripeCustomerId) {
      await this.ensureStripeCustomerIdIsUpdated({
        owner,
        stripeCustomerId: organizationOnboarding.stripeCustomerId,
      });
    }

    await OrganizationOnboardingRepository.update(organizationOnboarding.id, {
      organizationId: organization.id,
    });

    const updatedOrganization = await this.backwardCompatibilityForSubscriptionDetails({
      organization,
      paymentSubscriptionId: paymentDetails?.subscriptionId,
      paymentSubscriptionItemId: paymentDetails?.subscriptionItemId,
    });

    organization.metadata = updatedOrganization.metadata;

    const teamsData = teamsSchema.parse(organizationOnboarding.teams);
    await this.createOrMoveTeamsToOrganization(teamsData, owner, organization.id);

    await this.inviteMembers(
      invitedMembersSchema.parse(organizationOnboarding.invitedMembers),
      organization,
      teamsData
    );

    if (!organization.slug) {
      try {
        const { slug } = await OrganizationRepository.setSlug({
          id: organization.id,
          slug: organizationOnboarding.slug,
        });
        organization.slug = slug;
      } catch (error) {
        log.error(
          "RecoverableError: Error while setting slug for organization",
          safeStringify(error),
          safeStringify({
            attemptedSlug: organizationOnboarding.slug,
            organizationId: organization.id,
          })
        );
        throw new Error(
          `Unable to set slug '${organizationOnboarding.slug}' for organization ${organization.id}`
        );
      }
    }

    return { organization, owner };
  }
}
