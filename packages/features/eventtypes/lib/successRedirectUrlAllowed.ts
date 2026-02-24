import { EventRepository } from "@calcom/features/eventtypes/repositories/EventRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";

export type SuccessRedirectUrlValidationResult = { allowed: true } | { allowed: false; reason: string };

const UPGRADE_MESSAGE =
  "Redirect on booking is a feature for team plan users. Please upgrade to a team plan to use this feature.";

/**
 * Checks if a user is allowed to set successRedirectUrl on an event type.
 * This is a teams-only feature with grandfathering for existing users.
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
  // For updates, check if this event type is grandfathered (already has a redirect URL)
  if (eventTypeId) {
    const hasExistingRedirectUrl = await EventRepository.hasSuccessRedirectUrl(eventTypeId);
    if (hasExistingRedirectUrl) {
      return { allowed: true };
    }
  }

  // Check if user has a team plan
  const hasTeamPlan = await MembershipRepository.hasAcceptedPublishedTeamMembership(userId);
  if (hasTeamPlan) {
    return { allowed: true };
  }

  return { allowed: false, reason: UPGRADE_MESSAGE };
}
