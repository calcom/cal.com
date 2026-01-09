import { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { DeploymentRepository } from "@calcom/features/ee/deployment/repositories/DeploymentRepository";
import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";
import { findUserToBeOrgOwner } from "@calcom/features/ee/organizations/lib/server/orgCreationUtils";
import { OrganizationOnboardingRepository } from "@calcom/features/organizations/repositories/OrganizationOnboardingRepository";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { BillingPeriod } from "@calcom/prisma/enums";
import { orgOnboardingInvitedMembersSchema, orgOnboardingTeamsSchema } from "@calcom/prisma/zod-utils";

import { BaseOnboardingService } from "./BaseOnboardingService";
import type {
  CreateOnboardingIntentInput,
  OnboardingIntentResult,
  OrganizationOnboardingData,
  OrganizationData,
} from "./types";

const log = logger.getSubLogger({ prefix: ["SelfHostedOrganizationOnboardingService"] });

const invitedMembersSchema = orgOnboardingInvitedMembersSchema;
const teamsSchema = orgOnboardingTeamsSchema;

/**
 * Handles organization onboarding when billing is disabled (self-hosted admin flow).
 *
 * Flow:
 * 1. Create onboarding record
 * 2. Store teams/invites in database
 * 3. Immediately create organization, teams, and invite members
 * 4. Mark onboarding as complete
 * 5. Return organization ID
 */
export class SelfHostedOrganizationOnboardingService extends BaseOnboardingService {
  async createOnboardingIntent(input: CreateOnboardingIntentInput): Promise<OnboardingIntentResult> {
    log.debug(
      "Starting self-hosted onboarding flow (immediate organization creation)",
      safeStringify({
        slug: input.slug,
        teamsCount: input.teams?.length ?? 0,
        invitesCount: input.invitedMembers?.length ?? 0,
      })
    );

    // Step 1: Build and validate teams/invites (includes conflict slug detection)
    const { teamsData, invitedMembersData } = await this.buildTeamsAndInvites(
      input.slug,
      input.teams,
      input.invitedMembers
    );

    // Step 2: Create onboarding record with ALL data at once
    const organizationOnboarding = await this.createOnboardingRecord({
      ...input,
      teams: teamsData,
      invitedMembers: invitedMembersData,
    });
    const onboardingId = organizationOnboarding.id;

    // Check if this is an admin handover flow
    const handoverResult = this.handleAdminHandoverIfNeeded(input, onboardingId);
    if (handoverResult) {
      return handoverResult;
    }

    // Step 3: Create organization immediately (regular self-hosted flow)
    log.debug("Creating organization immediately (no payment required)", safeStringify({ onboardingId }));

    const { organization } = await this.createOrganization({
      id: onboardingId,
      organizationId: null,
      name: input.name,
      slug: input.slug,
      orgOwnerEmail: input.orgOwnerEmail,
      seats: input.seats ?? null,
      pricePerSeat: input.pricePerSeat ?? null,
      billingPeriod: input.billingPeriod ?? BillingPeriod.MONTHLY,
      invitedMembers: invitedMembersData,
      teams: teamsData,
      isPlatform: input.isPlatform,
      logo: organizationOnboarding.logo,
      bio: input.bio ?? null,
      brandColor: input.brandColor ?? null,
      bannerUrl: organizationOnboarding.bannerUrl,
      stripeCustomerId: null,
      isDomainConfigured: false,
    });

    // Step 4: Mark onboarding as complete
    await OrganizationOnboardingRepository.markAsComplete(onboardingId);

    log.debug(
      "Organization created successfully",
      safeStringify({ onboardingId, organizationId: organization.id })
    );

    // Step 5: Return result with organization ID
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
      checkoutUrl: null, // No checkout required
      organizationId: organization.id, // Organization created immediately
    };
  }

  async createOrganization(
    organizationOnboarding: OrganizationOnboardingData
  ): Promise<{ organization: Team; owner: User }> {
    const organizationRepository = getOrganizationRepository();
    log.info(
      "createOrganization (self-hosted)",
      safeStringify({
        orgId: organizationOnboarding.organizationId,
        orgSlug: organizationOnboarding.slug,
      })
    );

    if (IS_SELF_HOSTED) {
      const deploymentRepo = new DeploymentRepository(prisma);
      const licenseKeyService = await LicenseKeySingleton.getInstance(deploymentRepo);
      const hasValidLicense = await licenseKeyService.checkLicense();

      if (!hasValidLicense) {
        throw new Error("Self hosted license not valid");
      }
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

    const teamsData = teamsSchema.parse(organizationOnboarding.teams);
    await this.createOrMoveTeamsToOrganization(teamsData, owner, organization.id);

    await this.inviteMembers(
      invitedMembersSchema.parse(organizationOnboarding.invitedMembers),
      organization,
      teamsData
    );

    if (!organization.slug) {
      try {
        const { slug } = await organizationRepository.setSlug({
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
