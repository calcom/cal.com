import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { MembershipRole } from "@calcom/prisma/enums";

import { EventGroupBuilder } from "./EventGroupBuilder";
import { EventTypeGroupFilter } from "./EventTypeGroupFilter";
import type { FiltersType } from "./filterUtils";
import { ProfilePermissionProcessor } from "./ProfilePermissionProcessor";
import { TeamAccessUseCase } from "./teamAccessUseCase";

export interface GetUserEventGroupsDataInput {
  userId: number;
  userUpId: string;
  filters?: FiltersType;
}

export async function getUserEventGroupsData(input: GetUserEventGroupsDataInput) {
  const { userId, userUpId, filters } = input;

  const dependencies = {
    membershipRepository: MembershipRepository,
    profileRepository: ProfileRepository,
    teamAccessUseCase: new TeamAccessUseCase(),
  };

  const eventGroupBuilder = new EventGroupBuilder(dependencies);
  const { eventTypeGroups, teamPermissionsMap } = await eventGroupBuilder.buildEventGroups({
    userId,
    userUpId,
    filters,
  });

  const filteredEventTypeGroups = new EventTypeGroupFilter(eventTypeGroups, teamPermissionsMap)
    .has("eventType.read")
    .get();

  const profileProcessor = new ProfilePermissionProcessor();
  const profiles = profileProcessor.processProfiles(eventTypeGroups, teamPermissionsMap);

  const permissionCheckService = new PermissionCheckService();

  const teamIdsToCheck = filteredEventTypeGroups
    .map((group) => group.teamId)
    .filter((teamId): teamId is number => teamId !== null && teamId !== undefined);

  const teamPermissionChecks = teamIdsToCheck.map(async (teamId) => {
    const canCreateEventType = await permissionCheckService.checkPermission({
      userId,
      teamId: teamId,
      permission: "eventType.create",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });
    return {
      teamId,
      permissions: {
        canCreateEventType,
      },
    };
  });

  const teamPermissionsArray = await Promise.all(teamPermissionChecks);
  const teamPermissions = teamPermissionsArray.reduce(
    (acc, item) => {
      acc[item.teamId] = item.permissions;
      return acc;
    },
    {} as Record<number, { canCreateEventType: boolean }>
  );

  return {
    eventTypeGroups: filteredEventTypeGroups,
    profiles,
    teamPermissions,
  };
}
