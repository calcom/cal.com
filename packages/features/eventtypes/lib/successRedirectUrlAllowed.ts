import { PrismaOrganizationBillingRepository } from "@calcom/features/ee/billing/repository/billing/PrismaOrganizationBillingRepository";
import { SubscriptionStatus } from "@calcom/features/ee/billing/repository/billing/IBillingRepository";
import { checkUserHasActivePaidTeamPlan } from "@calcom/features/ee/teams/lib/checkUserHasActivePaidTeamPlan";
import { EventRepository } from "@calcom/features/eventtypes/repositories/EventRepository";
import { HOSTED_CAL_FEATURES, IS_SELF_HOSTED } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

const UPGRADE_MESSAGE =
  "Redirect on booking is a feature for team plan users. Please upgrade to a team plan to use this feature.";

export type SuccessRedirectUrlValidationResult = { allowed: true } | { allowed: false; reason: string };

/**
 * Checks if a user is allowed to set successRedirectUrl on an event type.
 * This is a teams-only feature with grandfathering for existing users.
 * Requires a paid team plan - trials are not allowed.
 *
 * @param userId - The ID of the user trying to set the redirect URL
 * @param eventTypeId - Optional event type ID for update operations (used for grandfathering check)
 * @returns Object indicating if the operation is allowed, with reason if not
 */
export async function checkSuccessRedirectUrlAllowed({
  userId,
  eventTypeId,
}: {
  userId: number;
  eventTypeId?: number;
}): Promise<SuccessRedirectUrlValidationResult> {
  if (IS_SELF_HOSTED) {
    return { allowed: true };
  }

  // For updates, check if this event type is grandfathered (already has a redirect URL)
  if (eventTypeId) {
    const hasExistingRedirectUrl = await EventRepository.hasSuccessRedirectUrl(eventTypeId);
    if (hasExistingRedirectUrl) {
      return { allowed: true };
    }
  }

  const { isActive } = await checkUserHasActivePaidTeamPlan(userId);
  if (isActive) {
    return { allowed: true };
  }

  return { allowed: false, reason: UPGRADE_MESSAGE };
}

export async function shouldSkipRedirectWarning({
  orgId,
  successRedirectUrl,
  successRedirectUrlUpdatedAt,
}: {
  orgId: number | null;
  successRedirectUrl: string | null;
  successRedirectUrlUpdatedAt: Date | null;
}): Promise<boolean> {
  if (!HOSTED_CAL_FEATURES) return true;
  if (!successRedirectUrl) return true;
  // Grandfathered: redirect URL was set before the redirect warning modal was introduced (null updatedAt means pre-existing)
  if (!successRedirectUrlUpdatedAt) return true;
  if (orgId) {
    const billingRepo = new PrismaOrganizationBillingRepository(prisma);
    const status = await billingRepo.findStatusByTeamId(orgId);
    return status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.PAST_DUE;
  }
  return false;
}
