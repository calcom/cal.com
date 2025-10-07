import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { UserPermissionRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { BillingEnabledOnboardingService } from "./BillingEnabledOnboardingService";
import type { IOrganizationOnboardingService } from "./IOrganizationOnboardingService";
import { SelfHostedOnboardingService } from "./SelfHostedOnboardingService";

const log = logger.getSubLogger({ prefix: ["OrganizationOnboardingFactory"] });

/**
 * Billing is disabled (self-hosted flow) when:
 * - IS_SELF_HOSTED=true AND user is ADMIN
 * - Exception: E2E tests always use billing flow
 * Otherwise, billing is enabled (Stripe flow).
 */
export class OrganizationOnboardingFactory {
  static create(user: NonNullable<TrpcSessionUser>): IOrganizationOnboardingService {
    const isBillingEnabled = this.isBillingEnabled(user);

    log.debug(
      "Creating onboarding service",
      safeStringify({
        userId: user.id,
        role: user.role,
        isSelfHosted: IS_SELF_HOSTED,
        isBillingEnabled,
        serviceType: isBillingEnabled ? "BillingEnabled" : "SelfHosted",
      })
    );

    if (isBillingEnabled) {
      return new BillingEnabledOnboardingService(user);
    } else {
      return new SelfHostedOnboardingService(user);
    }
  }

  private static isBillingEnabled(user: NonNullable<TrpcSessionUser>): boolean {
    // E2E tests always use billing flow
    if (process.env.NEXT_PUBLIC_IS_E2E) {
      return true;
    }

    // Self-hosted admins skip billing
    if (IS_SELF_HOSTED && user.role === UserPermissionRole.ADMIN) {
      return false;
    }

    // All other cases use billing
    return true;
  }
}
