import type { CreateOnboardingIntentInput, OnboardingIntentResult } from "./types";

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
}
