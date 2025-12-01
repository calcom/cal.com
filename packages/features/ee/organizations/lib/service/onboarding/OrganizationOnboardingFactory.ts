import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import { BillingEnabledOrgOnboardingService } from "./BillingEnabledOrgOnboardingService";
import type { IOrganizationOnboardingService } from "./IOrganizationOnboardingService";
import { SelfHostedOrganizationOnboardingService } from "./SelfHostedOnboardingService";
import type { OnboardingUser } from "./types";

const log = logger.getSubLogger({ prefix: ["OrganizationOnboardingFactory"] });

/**
 * Factory that selects the appropriate onboarding service based on configuration:
 * - Self-hosted flow (billing disabled) when: IS_TEAM_BILLING_ENABLED=false
 * - Exception: E2E tests always use self-hosted flow
 * Otherwise, billing is enabled (Stripe flow).
 */
export class OrganizationOnboardingFactory {
  static create(user: OnboardingUser): IOrganizationOnboardingService {
    const isBillingEnabled = this.isBillingEnabled();

    log.debug(
      "Creating onboarding service",
      safeStringify({
        userId: user.id,
        role: user.role,
        IS_TEAM_BILLING_ENABLED: IS_TEAM_BILLING_ENABLED,
        isBillingEnabled,
        serviceType: isBillingEnabled ? "BillingEnabled" : "SelfHosted",
      })
    );

    if (isBillingEnabled) {
      return new BillingEnabledOrgOnboardingService(user);
    } else {
      return new SelfHostedOrganizationOnboardingService(user);
    }
  }

  private static isBillingEnabled(): boolean {
    // E2E tests always skip billing (use self-hosted flow)
    if (process.env.NEXT_PUBLIC_IS_E2E) {
      return false;
    }

    // If billing is enabled globally, use it
    if (IS_TEAM_BILLING_ENABLED) {
      return true;
    }

    return false;
  }
}
