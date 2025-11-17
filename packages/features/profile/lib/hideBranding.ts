import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ name: "hideBranding" });
export type TeamWithBranding = {
  hideBranding: boolean | null;
  parent: {
    hideBranding: boolean | null;
  } | null;
};

export type ProfileWithBranding = {
  organization: {
    hideBranding: boolean | null;
  } | null;
};

export type UserWithBranding = {
  id: number;
  hideBranding: boolean | null;
};

export type UserWithProfileAndBranding = UserWithBranding & {
  profile: ProfileWithBranding | null;
};

// Internal type aliases for backward compatibility
type Team = TeamWithBranding;
type UserWithoutProfile = UserWithBranding;
type UserWithProfile = UserWithProfileAndBranding;

/**
 * Determines if branding should be hidden by checking entity and organization settings.
 *
 * This function implements the branding hierarchy: organization settings override entity settings.
 * If the organization has branding hidden, the entity's branding setting is ignored.
 *
 * @param options - Object containing entity and organization branding settings
 * @param options.entityHideBranding - Whether the entity (user/team) has branding hidden
 * @param options.organizationHideBranding - Whether the organization has branding hidden
 * @returns boolean - true if branding should be hidden, false otherwise
 *
 * @example
 * ```typescript
 * // Organization overrides entity setting
 * resolveHideBranding({
 *   entityHideBranding: false,
 *   organizationHideBranding: true
 * }); // Returns true (organization setting wins)
 *
 * // Entity setting is used when organization doesn't hide branding
 * resolveHideBranding({
 *   entityHideBranding: true,
 *   organizationHideBranding: false
 * }); // Returns true (entity setting is used)
 * ```
 */
function resolveHideBranding(options: {
  entityHideBranding: boolean | null;
  organizationHideBranding: boolean | null;
}): boolean {
  // If the organization has branding hidden, we should hide branding for the entity regardless of its own setting
  if (options.organizationHideBranding) {
    return true;
  }

  return options.entityHideBranding ?? false;
}

/**
 * Get hideBranding value for a user or team by their IDs
 */
export async function getHideBranding({
  userId,
  teamId,
  teamRepository,
  userRepository,
}: {
  userId?: number;
  teamId?: number;
  teamRepository: TeamRepository;
  userRepository: UserRepository;
}): Promise<boolean> {
  if (teamId) {
    // Get team data with parent organization
    const team = await teamRepository.findTeamWithParentHideBranding({ teamId });

    if (!team) return false;

    return resolveHideBranding({
      entityHideBranding: team.hideBranding,
      organizationHideBranding: team.parent?.hideBranding ?? null,
    });
  } else if (userId) {
    // Get user data with profile and organization
    const user = await userRepository.findUserWithHideBranding({ userId });

    if (!user) return false;

    return resolveHideBranding({
      entityHideBranding: user.hideBranding,
      organizationHideBranding: user.profiles?.[0]?.organization?.hideBranding,
    });
  }

  return false;
}

/**
 * Determines if branding should be hidden for an event using pre-fetched profile data.
 *
 * This function is used when you already have the user's profile data and don't need to fetch it.
 * It's more efficient than shouldHideBrandingForEvent when profile data is already available.
 *
 * @param eventTypeId - The event type ID for the event
 * @param owner - User with profile data including organization.hideBranding, or null for team events
 * @param team - Team with hideBranding and parent.hideBranding fields, or null for user events
 * @returns boolean - true if branding should be hidden, false otherwise
 *
 * @note Data Requirements:
 * - For team events: team.hideBranding and team.parent.hideBranding must be present
 * - For user events: owner.hideBranding and owner.profile.organization.hideBranding must be present
 * - Either team or owner must be provided, but not both
 */
export function shouldHideBrandingForEventUsingProfile({
  eventTypeId,
  owner,
  team,
}: {
  owner: UserWithProfile | null;
  team: Team | null;
  eventTypeId: number;
}) {
  let hideBranding;
  if (team) {
    hideBranding = resolveHideBranding({
      entityHideBranding: team.hideBranding ?? null,
      organizationHideBranding: team.parent?.hideBranding ?? null,
    });
  } else if (owner) {
    hideBranding = resolveHideBranding({
      entityHideBranding: owner.hideBranding ?? null,
      organizationHideBranding: owner.profile?.organization?.hideBranding ?? null,
    });
  } else {
    log.error(`No owner or team found for event: ${eventTypeId}`);
    return false;
  }
  return hideBranding;
}

/**
 * Determines if branding should be hidden for an event based on team, user, and organization settings.
 *
 * This function handles both team events and user events, with different data requirements for each:
 * - Team events: Requires team.hideBranding and team.parent.hideBranding fields
 * - User events: Requires owner.hideBranding and may fetch organization profile if needed
 *
 * @param eventTypeId - The event type ID for the event
 * @param team - Team object with hideBranding and parent.hideBranding fields, or null for user events
 * @param owner - User object with hideBranding field, or null for team events
 * @param organizationId - Organization ID for profile lookup (only needed for user events without team)
 * @returns Promise<boolean> - true if branding should be hidden, false otherwise
 *
 * @example
 * ```typescript
 * // Team event
 * const hideBranding = await shouldHideBrandingForEvent({
 *   eventTypeId: 123,
 *   team: { hideBranding: true, parent: { hideBranding: false } },
 *   owner: null,
 *   organizationId: null
 * });
 *
 * // User event
 * const hideBranding = await shouldHideBrandingForEvent({
 *   eventTypeId: 456,
 *   team: null,
 *   owner: { id: 789, hideBranding: false },
 *   organizationId: 101
 * });
 * ```
 *
 * @note Data Requirements:
 * - For team events: team.hideBranding and team.parent.hideBranding must be present
 * - For user events: owner.hideBranding must be present
 * - organizationId is only used for user events to fetch organization profile
 * - If team is provided, owner and organizationId are ignored
 * - If owner is provided without team, organizationId is used to fetch profile
 */
export async function shouldHideBrandingForEvent({
  eventTypeId,
  team,
  owner,
  organizationId,
}: {
  eventTypeId: number;
  team: Team | null;
  owner: UserWithoutProfile | null;
  organizationId: number | null;
}) {
  let ownerProfile = null;
  if (team) {
    return shouldHideBrandingForTeamEvent({
      team,
      eventTypeId,
    });
  } else if (owner) {
    // Needed only for User events, not for Team events
    ownerProfile = organizationId
      ? await ProfileRepository.findByUserIdAndOrgSlug({
          userId: owner.id,
          organizationId,
        })
      : null;

    return shouldHideBrandingForUserEvent({
      eventTypeId,
      owner: {
        ...owner,
        profile: ownerProfile,
      },
    });
  } else {
    log.error(`No owner or team found for event: ${eventTypeId}`);
    return false;
  }
}

/**
 * A convenience wrapper for shouldHideBrandingForEventUsingProfile to use for Team events
 */
export function shouldHideBrandingForTeamEvent({ eventTypeId, team }: { eventTypeId: number; team: Team }) {
  return shouldHideBrandingForEventUsingProfile({
    owner: null,
    team,
    eventTypeId,
  });
}

/**
 * A convenience wrapper for shouldHideBrandingForEventUsingProfile to use for User events
 */
export function shouldHideBrandingForUserEvent({
  eventTypeId,
  owner,
}: {
  eventTypeId: number;
  owner: UserWithProfile;
}) {
  return shouldHideBrandingForEventUsingProfile({
    owner,
    team: null,
    eventTypeId,
  });
}

