import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TEventTypeInputSchema } from "./getByViewer.schema";
import { TeamAccessUseCase } from "./teamAccessUseCase";
import { EventGroupBuilder } from "./usecases/EventGroupBuilder";
import { ProfilePermissionProcessor } from "./usecases/ProfilePermissionProcessor";
import { EventTypeGroupFilter } from "./utils/EventTypeGroupFilter";

type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TEventTypeInputSchema;
};

export const getUserEventGroups = async ({ ctx, input }: GetByViewerOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `eventTypes:getUserProfiles:${ctx.user.id}`,
    rateLimitingType: "common",
  });

  const user = ctx.user;
  const userProfile = user.profile;

  // Validate profile exists
  const profile = await ProfileRepository.findByUpId(userProfile.upId);
  if (!profile) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  // Initialize dependencies
  const dependencies = {
    membershipRepository: MembershipRepository,
    profileRepository: ProfileRepository,
    teamAccessUseCase: new TeamAccessUseCase(),
  };

  // Build event groups
  const eventGroupBuilder = new EventGroupBuilder(dependencies);
  const { eventTypeGroups, teamPermissionsMap } = await eventGroupBuilder.buildEventGroups({
    userId: user.id,
    userUpId: userProfile.upId,
    filters: input?.filters,
    forRoutingForms: input?.forRoutingForms,
  });

  const filteredEventTypeGroups = new EventTypeGroupFilter(eventTypeGroups, teamPermissionsMap)
    .has("eventType.read")
    .get();

  // Process profiles with permissions
  const profileProcessor = new ProfilePermissionProcessor();
  const profiles = profileProcessor.processProfiles(eventTypeGroups, teamPermissionsMap);

  const permissionCheckService = new PermissionCheckService();

  const teamIdsToCheck = filteredEventTypeGroups
    .map((group) => group.teamId)
    .filter((teamId): teamId is number => teamId !== null && teamId !== undefined);

  const teamPermissionChecks = teamIdsToCheck.map(async (teamId) => {
    const canCreateEventType = await permissionCheckService.checkPermission({
      userId: user.id,
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
  const teamPermissions = teamPermissionsArray.reduce((acc, item) => {
    acc[item.teamId] = item.permissions;
    return acc;
  }, {} as Record<number, { canCreateEventType: boolean }>);

  return {
    eventTypeGroups: filteredEventTypeGroups,
    profiles,
    teamPermissions,
  };
};

// Re-export the compareMembership function for backward compatibility
export { compareMembership } from "@calcom/features/eventtypes/lib/getEventTypesByViewer";
