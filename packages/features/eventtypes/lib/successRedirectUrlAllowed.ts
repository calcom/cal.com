import { checkUserHasActivePaidTeamPlan } from "@calcom/features/ee/teams/lib/checkUserHasActivePaidTeamPlan";
import { EventRepository } from "@calcom/features/eventtypes/repositories/EventRepository";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";

export type SuccessRedirectUrlValidationResult = { allowed: true } | { allowed: false; reason: string };

const UPGRADE_MESSAGE =
  "Redirect on booking is a feature for team plan users. Please upgrade to a team plan to use this feature.";

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
