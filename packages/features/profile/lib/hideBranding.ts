import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ name: "hideBranding" });
const teamRepository = new TeamRepository(prisma);
const userRepository = new UserRepository(prisma);
type Team = {
  hideBranding: boolean | null;
  parent: {
    hideBranding: boolean | null;
  } | null;
};

type Profile = {
  organization: {
    hideBranding: boolean | null;
  } | null;
};

type UserWithoutProfile = {
  id: number;
  hideBranding: boolean | null;
};

type UserWithProfile = UserWithoutProfile & {
  profile: Profile | null;
};

/**
 * Determines if branding should be hidden by checking entity and organization settings
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
}: {
  userId?: number;
  teamId?: number;
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
 * Determines if branding should be hidden for an event that could be a team event or user event
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
 * A wrapper over shouldHideBrandingForEventUsingProfile that fetches the profile itself
 * Use it when you don't have user's profile
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
