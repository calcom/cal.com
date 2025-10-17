import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import { BillingEnabledOrgDowngradeService } from "./BillingEnabledOrgDowngradeService";
import type { IOrganizationDowngradeService } from "./IOrganizationDowngradeService";
import { SelfHostedOrganizationDowngradeService } from "./SelfHostedOrgDowngradeService";

const log = logger.getSubLogger({ prefix: ["OrganizationDowngradeFactory"] });

/**
 * Factory that selects the appropriate downgrade service based on configuration:
 * - Self-hosted flow (billing disabled) when: IS_TEAM_BILLING_ENABLED=false
 * - Exception: E2E tests always use self-hosted flow
 * Otherwise, billing is enabled (Stripe flow).
 */
export class OrganizationDowngradeFactory {
  static create(): IOrganizationDowngradeService {
    const isBillingEnabled = this.isBillingEnabled();

    log.debug(
      "Creating downgrade service",
      safeStringify({
        IS_TEAM_BILLING_ENABLED: IS_TEAM_BILLING_ENABLED,
        isBillingEnabled,
        serviceType: isBillingEnabled ? "BillingEnabled" : "SelfHosted",
      })
    );

    if (isBillingEnabled) {
      return new BillingEnabledOrgDowngradeService();
    } else {
      return new SelfHostedOrganizationDowngradeService();
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
