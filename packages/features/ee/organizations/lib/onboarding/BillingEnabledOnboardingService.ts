import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";

import { BaseOnboardingService } from "./BaseOnboardingService";
import type { CreateOnboardingIntentInput, OnboardingIntentResult } from "./types";

const log = logger.getSubLogger({ prefix: ["BillingEnabledOnboardingService"] });

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
}
