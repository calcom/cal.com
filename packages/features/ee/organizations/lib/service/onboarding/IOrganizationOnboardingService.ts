import type { Team, User } from "@calcom/prisma/client";

import type {
  CreateOnboardingIntentInput,
  OnboardingIntentResult,
  OrganizationOnboardingData,
} from "./types";

/**
 * Interface for organization onboarding services.
 * Implementations handle different onboarding flows (billing-enabled vs self-hosted).
 */
export interface IOrganizationOnboardingService {
  /**
   * Creates an organization onboarding intent.
   * Depending on the implementation:
   * - BillingEnabled: Creates Stripe checkout session, returns checkoutUrl
   * - SelfHosted: Creates organization immediately, returns organizationId
   */
  createOnboardingIntent(input: CreateOnboardingIntentInput): Promise<OnboardingIntentResult>;

  /**
   * Creates the actual organization from onboarding data.
   * Depending on the implementation:
   * - SelfHosted: Validates license, creates organization without payment
   * - BillingEnabled: Requires payment details, handles subscription
   */
  createOrganization(
    organizationOnboarding: OrganizationOnboardingData,
    paymentDetails?: { subscriptionId: string; subscriptionItemId: string }
  ): Promise<{ organization: Team; owner: User }>;
}
