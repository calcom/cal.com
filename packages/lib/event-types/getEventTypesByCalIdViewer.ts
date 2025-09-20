// eslint-disable-next-line no-restricted-imports
import { orderBy } from "lodash";

import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import { getDefaultAvatar } from "@calid/features/lib/defaultAvatar";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import logger from "@calcom/lib/logger";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { safeStringify } from "@calcom/lib/safeStringify";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventTypeRepository";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
import { CalIdMembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { eventTypeMetaDataSchemaWithUntypedApps } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

const log = logger.getSubLogger({ prefix: ["viewer.eventTypes.getByViewer"] });

type User = {
  id: number;
  profile: {
    upId: string;
  };
};

type Filters = {
  calIdTeamIds?: number[];
  upIds?: string[];
  schedulingTypes?: SchedulingType[];
};

export type EventTypesByViewer = Awaited<ReturnType<typeof getEventTypesByViewer>>;

export const getEventTypesByViewer = async (user: User, filters?: Filters, forRoutingForms?: boolean) => {
  const userProfile = user.profile;
  const profile = await ProfileRepository.findByUpId(userProfile.upId);
  const parentOrgHasLockedEventTypes =
    profile?.organization?.organizationSettings?.lockEventTypeCreationForUsers;
  const isFilterSet = filters && hasFilter(filters);
  const isUpIdInFilter = filters?.upIds?.includes(userProfile.upId);

  // Debug logging
  log.debug("getEventTypesByViewer debug:", {
    userId: user.id,
    userProfile,
    profile: profile ? { id: profile.id, upId: profile.upId } : null,
    forRoutingForms,
    filters,
  });

  let shouldListUserEvents = !isFilterSet || isUpIdInFilter;
  // FIX: Handles the case when an upId != lightProfile - pretend like there is no filter.
  // Results in {"eventTypeGroups":[],"profiles":[]} - this crashes all dependencies.
  if (isFilterSet && filters?.upIds && !isUpIdInFilter) {
    shouldListUserEvents = true;
  }
  const eventTypeRepo = new EventTypeRepository(prisma);
  const [profileCalIdMemberships, profileEventTypes] = await Promise.all([
    MembershipRepository.findAllByUpIdIncludeCalIdTeamWithMembersAndEventTypes(
      {
        upId: userProfile.upId,
      },
      {
        where: {
          acceptedInvitation: true,
        },
      }
    ),
    shouldListUserEvents
      ? eventTypeRepo.findAllByUpIdForCalidTeam(
          {
            upId: userProfile.upId,
            userId: user.id,
          },
          {
            where: {
              teamId: null,
            },
            orderBy: [
              {
                position: "desc",
              },
              {
                id: "asc",
              },
            ],
          }
        )
      : [],
  ]);

  if (!profile) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  const calIdMemberships = profileCalIdMemberships.map((membership) => ({
    ...membership,
    calIdTeam: {
      ...membership.calIdTeam,
      metadata: membership.calIdTeam.metadata ? teamMetadataSchema.parse(membership.calIdTeam.metadata) : null,
    },
  }));

  log.debug(
    safeStringify({
      profileCalIdMemberships,
      profileEventTypes,
    })
  );

  type UserEventTypes = (typeof profileEventTypes)[number];

  const mapEventType = async (eventType: UserEventTypes) => {
    const userRepo = new UserRepository(prisma);
    return {
      ...eventType,
      safeDescription: eventType?.description ? markdownToSafeHTML(eventType.description) : undefined,
      users: await Promise.all(
        (!!eventType?.hosts?.length ? eventType?.hosts.map((host) => host.user) : eventType.users).map(
          async (u) =>
            await userRepo.enrichUserWithItsProfile({
              user: u,
            })
        )
      ),
      metadata: eventType.metadata ? eventTypeMetaDataSchemaWithUntypedApps.parse(eventType.metadata) : null,
      children: await Promise.all(
        (eventType.children || []).map(async (c) => ({
          ...c,
          users: await Promise.all(
            c.users.map(
              async (u) =>
                await userRepo.enrichUserWithItsProfile({
                  user: u,
                })
            )
          ),
        }))
      ),
    };
  };

  const userEventTypes = (await Promise.all(profileEventTypes.map(mapEventType))).filter((eventType) => {
    const isAChildEvent = eventType.parentId;
    if (!isAChildEvent) {
      return true;
    }
    // A child event only has one user
    const childEventAssignee = eventType.users[0];
    if (!childEventAssignee || childEventAssignee.id != user.id) {
      return false;
    }
    return true;
  });

  type EventTypeGroup = {
    teamId?: number | null;
    parentId?: number | null;
    bookerUrl: string;
    membershipRole?: CalIdMembershipRole | null;
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
    eventTypes: typeof userEventTypes;
  };

  let eventTypeGroups: EventTypeGroup[] = [];

  const unmanagedEventTypes = userEventTypes.filter(
    (evType) => evType.schedulingType !== SchedulingType.MANAGED
  );

  log.debug(safeStringify({ profileCalIdMemberships, profileEventTypes, profile }));

  log.debug(
    "Filter Settings",
    safeStringify({
      isFilterSet,
      isProfileIdInFilter: isUpIdInFilter,
    })
  );

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
      eventTypes: orderBy(unmanagedEventTypes, ["position", "id"], ["desc", "asc"]),
      metadata: {
        membershipCount: 1,
        readOnly: false,
      },
    });
  }

  const filterByCalIdTeamIds = async (eventType: Awaited<ReturnType<typeof mapEventType>>) => {
    if (!filters || !hasFilter(filters)) {
      return true;
    }
    return filters?.calIdTeamIds?.includes(eventType?.calIdTeamId || 0) ?? false;
  };
  const filterBySchedulingTypes = (evType: Awaited<ReturnType<typeof mapEventType>>) => {
    if (!filters || !hasFilter(filters) || !filters.schedulingTypes) {
      return true;
    }

    if (!evType.schedulingType) return false;

    return filters.schedulingTypes.includes(evType.schedulingType);
  };

  eventTypeGroups = ([] as EventTypeGroup[]).concat(
    eventTypeGroups,
    // Process CalIdTeam memberships
    await Promise.all(
      calIdMemberships
        .map(async (membership) => {
          const calIdTeam = {
            ...membership.calIdTeam,
            metadata: membership.calIdTeam.metadata ? teamMetadataSchema.parse(membership.calIdTeam.metadata) : null,
          };

          const eventTypes = await Promise.all(calIdTeam.eventTypes.map(mapEventType));
          
          return {
            teamId: calIdTeam.id,
            parentId: null, // CalIdTeams don't have parent organizations
            bookerUrl: getBookerBaseUrlSync(null), // Use default booker URL
            membershipRole: membership.role,
            profile: {
              image: getDefaultAvatar(calIdTeam.logoUrl, calIdTeam.name),
              name: calIdTeam.name,
              slug: calIdTeam.slug ? `calid/${calIdTeam.slug}` : null,
            },
            metadata: {
              membershipCount: calIdTeam.members.length,
              readOnly: membership.role === "MEMBER",
            },
            eventTypes: eventTypes
              .filter(filterByCalIdTeamIds)
              .filter((evType) => {
                const res = evType.userId === null || evType.userId === user.id;
                return res;
              })
              .filter((evType) =>
                membership.role === "MEMBER"
                  ? evType.schedulingType !== SchedulingType.MANAGED
                  : true
              )
              .filter(filterBySchedulingTypes),
          };
        })
    )
  );

  const denormalizedPayload = {
    eventTypeGroups,
    // so we can show a dropdown when the user has teams
    profiles: eventTypeGroups.map((group) => ({
      ...group.profile,
      ...group.metadata,
      teamId: group.teamId,
      membershipRole: group.membershipRole,
    })),
  };

  // Debug logging for the final payload
  log.debug("getEventTypesByViewer final payload:", {
    eventTypeGroupsCount: eventTypeGroups.length,
    profilesCount: denormalizedPayload.profiles.length,
    eventTypeGroups: eventTypeGroups.map(group => ({
      teamId: group.teamId,
      eventTypesCount: group.eventTypes.length,
      profile: group.profile.name,
    })),
  });

  return normalizePayload(denormalizedPayload);

  /**
   * Reduces the size of payload
   */
  function normalizePayload(payload: typeof denormalizedPayload) {
    const allUsersAcrossAllEventTypes = new Map<
      number,
      EventTypeGroup["eventTypes"][number]["users"][number]
    >();
    const eventTypeGroups = payload.eventTypeGroups.map((group) => {
      return {
        ...group,
        eventTypes: group.eventTypes.map((eventType) => {
          const { users, ...rest } = eventType;
          return {
            ...rest,
            // Send userIds per event and keep the actual users object outside
            userIds: users.map((user) => {
              allUsersAcrossAllEventTypes.set(user.id, user);
              return user.id;
            }),
          };
        }),
      };
    });

    return {
      ...payload,
      allUsersAcrossAllEventTypes,
      eventTypeGroups,
    };
  }
};

export function compareMembership(mship1: CalIdMembershipRole, mship2: CalIdMembershipRole) {
  const mshipToNumber = (mship: CalIdMembershipRole) =>
    Object.keys(CalIdMembershipRole).findIndex((mmship) => mmship === mship);
  return mshipToNumber(mship1) > mshipToNumber(mship2);
}
