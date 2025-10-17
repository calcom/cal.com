import { createOrganizationFromOnboarding } from "@calcom/features/ee/organizations/lib/server/createOrganizationFromOnboarding";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";
import { BillingPeriod } from "@calcom/prisma/enums";

import { BaseOnboardingService } from "./BaseOnboardingService";
import type { CreateOnboardingIntentInput, OnboardingIntentResult } from "./types";

const log = logger.getSubLogger({ prefix: ["SelfHostedOnboardingService"] });

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
export class SelfHostedOnboardingService extends BaseOnboardingService {
  async createOnboardingIntent(input: CreateOnboardingIntentInput): Promise<OnboardingIntentResult> {
    log.debug(
      "Starting self-hosted onboarding flow (immediate organization creation)",
      safeStringify({
        slug: input.slug,
        teamsCount: input.teams?.length ?? 0,
        invitesCount: input.invitedMembers?.length ?? 0,
      })
    );

    // Step 1: Create onboarding record
    const organizationOnboarding = await this.createOnboardingRecord(input);
    const onboardingId = organizationOnboarding.id;

    // Step 2: Filter and normalize teams/invites
    const { teamsData, invitedMembersData } = this.filterTeamsAndInvites(input.teams, input.invitedMembers);

    // Step 3: Store teams and invites in onboarding record
    await OrganizationOnboardingRepository.update(onboardingId, {
      teams: teamsData,
      invitedMembers: invitedMembersData,
    });

    // Step 4: Create organization immediately
    log.debug("Creating organization immediately (no payment required)", safeStringify({ onboardingId }));

    const { organization } = await createOrganizationFromOnboarding({
      organizationOnboarding: {
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
        logo: input.logo ?? null,
        bio: input.bio ?? null,
        brandColor: input.brandColor ?? null,
        bannerUrl: input.bannerUrl ?? null,
        stripeCustomerId: null,
        isDomainConfigured: false,
      },
    });

    // Step 5: Mark onboarding as complete
    await OrganizationOnboardingRepository.markAsComplete(onboardingId);

    log.debug(
      "Organization created successfully",
      safeStringify({ onboardingId, organizationId: organization.id })
    );

    // Step 6: Return result with organization ID
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
}
