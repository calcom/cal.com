import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TeamAccessUseCase } from "../teamAccessUseCase";
import {
  shouldListUserEvents,
  shouldIncludeTeamMembership,
  createTeamSlug,
  type FilterContext,
} from "../utils/filterUtils";
import { buildTeamPermissionsMap, getEffectiveRole, type TeamPermissions } from "../utils/permissionUtils";
import { createUserEventGroup, createTeamEventGroup, type EventTypeGroup } from "../utils/transformUtils";

export interface EventGroupBuilderDependencies {
  membershipRepository: typeof MembershipRepository;
  profileRepository: typeof ProfileRepository;
  teamAccessUseCase: TeamAccessUseCase;
}

export interface EventGroupBuilderInput {
  userId: number;
  userUpId: string;
  filters?: FilterContext["filters"];
  forRoutingForms?: boolean;
}

export class EventGroupBuilder {
  constructor(private dependencies: EventGroupBuilderDependencies) {}

  async buildEventGroups(input: EventGroupBuilderInput): Promise<{
    eventTypeGroups: EventTypeGroup[];
    teamPermissionsMap: Map<number, TeamPermissions>;
  }> {
    const { userId, userUpId, filters, forRoutingForms } = input;

    // Get user profile
    const profile = await this.dependencies.profileRepository.findByUpId(userUpId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const parentOrgHasLockedEventTypes =
      profile.organization?.organizationSettings?.lockEventTypeCreationForUsers;

    // Get memberships
    const profileMemberships = await this.dependencies.membershipRepository.findAllByUpIdIncludeTeam(
      { upId: userUpId },
      { where: { accepted: true } }
    );

    // Filter memberships based on PBAC permissions
    const accessibleMemberships =
      await this.dependencies.teamAccessUseCase.filterTeamsByEventTypeReadPermission(
        profileMemberships,
        userId
      );

    if (!accessibleMemberships) {
      throw new Error("Failed to filter team memberships");
    }

    const memberships = accessibleMemberships.map((membership) => ({
      ...membership,
      team: {
        ...membership.team,
        metadata: teamMetadataSchema.parse(membership.team.metadata),
      },
    }));

    // This ensures org roles are considered when calculating effective permissions
    const teamMemberships = profileMemberships.map((membership) => ({
      teamId: membership.team.id,
      membershipRole: membership.role,
    }));

    // Build permissions map
    const teamPermissionsMap = await buildTeamPermissionsMap(memberships, teamMemberships, userId);

    // Build event type groups
    const eventTypeGroups: EventTypeGroup[] = [];

    // Add user events if needed
    const filterContext: FilterContext = { filters, userUpId };
    if (shouldListUserEvents(filterContext)) {
      const userGroup = await createUserEventGroup(profile, parentOrgHasLockedEventTypes ?? false);
      eventTypeGroups.push(userGroup);
    }

    // Add team events
    const teamGroupResults = await Promise.allSettled(
      memberships
        .filter((membership) => shouldIncludeTeamMembership(membership, filters))
        .map(async (membership) => {
          const orgMembership = teamMemberships.find(
            (teamM) => teamM.teamId === membership.team.parentId
          )?.membershipRole;

          const effectiveRole = getEffectiveRole(orgMembership, membership.role);
          const permissions = teamPermissionsMap.get(membership.team.id);

          if (!permissions) {
            throw new Error(`Permissions not found for team ${membership.team.id}`);
          }

          const teamSlug = createTeamSlug(
            membership.team.slug,
            !!membership.team.parentId,
            forRoutingForms ?? false
          );

          return createTeamEventGroup(membership, effectiveRole, teamSlug, permissions);
        })
    );

    const teamGroups = teamGroupResults
      .filter((result): result is PromiseFulfilledResult<EventTypeGroup> => result.status === "fulfilled")
      .map((result) => result.value);

    const failedTeams = teamGroupResults.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );

    if (failedTeams.length > 0) {
      console.warn(`Failed to process ${failedTeams.length} teams:`, failedTeams);
    }

    eventTypeGroups.push(...teamGroups);

    return {
      eventTypeGroups,
      teamPermissionsMap,
    };
  }
}
