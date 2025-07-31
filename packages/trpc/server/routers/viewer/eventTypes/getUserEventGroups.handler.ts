import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
// import { getEventTypesByViewer } from "@calcom/lib/event-types/getEventTypesByViewer";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TEventTypeInputSchema } from "./getByViewer.schema";
import { TeamAccessUseCase } from "./teamAccessUseCase";

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
  const filters = input?.filters;
  const forRoutingForms = input?.forRoutingForms;

  const userProfile = user.profile;
  const profile = await ProfileRepository.findByUpId(userProfile.upId);
  const parentOrgHasLockedEventTypes =
    profile?.organization?.organizationSettings?.lockEventTypeCreationForUsers;
  const isFilterSet = filters && hasFilter(filters);
  const isUpIdInFilter = filters?.upIds?.includes(userProfile.upId);

  let shouldListUserEvents = !isFilterSet || isUpIdInFilter;

  if (isFilterSet && filters?.upIds && !isUpIdInFilter) {
    shouldListUserEvents = true;
  }

  const profileMemberships = await MembershipRepository.findAllByUpIdIncludeTeam(
    {
      upId: userProfile.upId,
    },
    {
      where: {
        accepted: true,
      },
    }
  );

  if (!profile) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  // Filter memberships based on PBAC permissions
  const teamAccessUseCase = new TeamAccessUseCase();
  const accessibleMemberships = await teamAccessUseCase.filterTeamsByEventTypeReadPermission(
    profileMemberships,
    user.id
  );

  const memberships = accessibleMemberships.map((membership) => ({
    ...membership,
    team: {
      ...membership.team,
      metadata: teamMetadataSchema.parse(membership.team.metadata),
    },
  }));

  const teamMemberships = accessibleMemberships.map((membership) => ({
    teamId: membership.team.id,
    membershipRole: membership.role,
  }));

  type EventTypeGroup = {
    teamId?: number | null;
    parentId?: number | null;
    bookerUrl: string;
    membershipRole?: MembershipRole | null;
    profile: {
      slug: (typeof profile)["username"] | null;
      name: (typeof profile)["name"];
      image: string;
      eventTypesLockedByOrg?: boolean;
    };
    metadata: {
      membershipCount: number;
      readOnly: boolean;
    };
  };

  let eventTypeGroups: EventTypeGroup[] = [];

  if (shouldListUserEvents) {
    const bookerUrl = await getBookerBaseUrl(profile.organizationId ?? null);
    eventTypeGroups.push({
      teamId: null,
      bookerUrl,
      membershipRole: null,
      profile: {
        slug: profile.username,
        name: profile.name,
        image: getUserAvatarUrl({
          avatarUrl: profile.avatarUrl,
        }),
        eventTypesLockedByOrg: parentOrgHasLockedEventTypes,
      },
      metadata: {
        membershipCount: 1,
        readOnly: false,
      },
    });
  }

  // First, get all PBAC permissions for teams to avoid duplicate requests
  const teamPermissionsMap = new Map<number, { canCreate: boolean; canEdit: boolean; canDelete: boolean }>();

  for (const membership of memberships) {
    const orgMembership = teamMemberships.find(
      (teamM) => teamM.teamId === membership.team.parentId
    )?.membershipRole;

    const effectiveRole =
      orgMembership && compareMembership(orgMembership, membership.role) ? orgMembership : membership.role;

    try {
      const permissions = await getResourcePermissions({
        userId: user.id,
        teamId: membership.team.id,
        resource: Resource.EventType,
        userRole: effectiveRole,
        fallbackRoles: {
          create: {
            roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
          },
          update: {
            roles: [MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER],
          },
          delete: {
            roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
          },
        },
      });

      teamPermissionsMap.set(membership.team.id, {
        canCreate: permissions.canCreate,
        canEdit: permissions.canEdit,
        canDelete: permissions.canDelete,
      });
    } catch (error) {
      // If PBAC check fails, fall back to role-based check
      console.warn(
        `PBAC check failed for user ${user.id} on team ${membership.team.id}, falling back to role check:`,
        error
      );
      teamPermissionsMap.set(membership.team.id, {
        canCreate: effectiveRole === MembershipRole.ADMIN || effectiveRole === MembershipRole.OWNER,
        canEdit:
          effectiveRole === MembershipRole.ADMIN ||
          effectiveRole === MembershipRole.OWNER ||
          effectiveRole === MembershipRole.MEMBER,
        canDelete: effectiveRole === MembershipRole.ADMIN || effectiveRole === MembershipRole.OWNER,
      });
    }
  }

  eventTypeGroups = ([] as EventTypeGroup[]).concat(
    eventTypeGroups,
    await Promise.all(
      memberships
        .filter((mmship) => {
          // Organization memberships are already filtered out in TeamAccessUseCase
          if (!filters || !hasFilter(filters)) {
            return true;
          }
          return filters?.teamIds?.includes(mmship?.team?.id || 0) ?? false;
        })
        .map(async (membership) => {
          const orgMembership = teamMemberships.find(
            (teamM) => teamM.teamId === membership.team.parentId
          )?.membershipRole;

          const team = {
            ...membership.team,
            metadata: teamMetadataSchema.parse(membership.team.metadata),
          };

          let slug;

          if (forRoutingForms) {
            // For Routing form we want to ensure that after migration of team to an org, the URL remains same for the team
            // Once we solve this https://github.com/calcom/cal.com/issues/12399, we can remove this conditional change in slug
            slug = `team/${team.slug}`;
          } else {
            // In an Org, a team can be accessed without /team prefix as well as with /team prefix
            slug = team.slug ? (!team.parentId ? `team/${team.slug}` : `${team.slug}`) : null;
          }

          const effectiveRole =
            orgMembership && compareMembership(orgMembership, membership.role)
              ? orgMembership
              : membership.role;

          // Get permissions from the pre-computed map
          const permissions = teamPermissionsMap.get(team.id);
          const isReadOnly = permissions ? !permissions.canEdit : true; // Default to readOnly if no permissions found

          // const eventTypes = await Promise.all(team.eventTypes.map(mapEventType));
          const teamParentMetadata = team.parent ? teamMetadataSchema.parse(team.parent.metadata) : null;
          return {
            teamId: team.id,
            parentId: team.parentId,
            bookerUrl: getBookerBaseUrlSync(team.parent?.slug ?? teamParentMetadata?.requestedSlug ?? null),
            membershipRole: effectiveRole,
            profile: {
              image: team.parent
                ? getPlaceholderAvatar(team.parent.logoUrl, team.parent.name)
                : getPlaceholderAvatar(team.logoUrl, team.name),
              name: team.name,
              slug,
            },
            metadata: {
              membershipCount: 0,
              readOnly: isReadOnly,
            },
          };
        })
    )
  );

  // Use pre-computed permissions for profiles
  const profilesWithPermissions = eventTypeGroups.map((group) => {
    let canCreateEventTypes: boolean | undefined = undefined;
    let canUpdateEventTypes: boolean | undefined = undefined;

    // For team profiles, get permissions from the pre-computed map
    if (group.teamId) {
      const permissions = teamPermissionsMap.get(group.teamId);
      canCreateEventTypes = permissions?.canCreate;
      canUpdateEventTypes = permissions?.canEdit;
    }

    return {
      ...group.profile,
      ...group.metadata,
      teamId: group.teamId,
      membershipRole: group.membershipRole,
      canCreateEventTypes,
      canUpdateEventTypes,
    };
  });

  const denormalizedPayload = {
    eventTypeGroups,
    // so we can show a dropdown when the user has teams
    profiles: profilesWithPermissions,
  };

  return denormalizedPayload;
};

export function compareMembership(mship1: MembershipRole, mship2: MembershipRole) {
  const mshipToNumber = (mship: MembershipRole) =>
    Object.keys(MembershipRole).findIndex((mmship) => mmship === mship);
  return mshipToNumber(mship1) > mshipToNumber(mship2);
}
