// eslint-disable-next-line no-restricted-imports
import { orderBy } from "lodash";

import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { getOrgAvatarUrl, getTeamAvatarUrl, getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import logger from "@calcom/lib/logger";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { safeStringify } from "@calcom/lib/safeStringify";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TEventTypeInputSchema } from "./getByViewer.schema";

const log = logger.getSubLogger({ prefix: ["viewer.eventTypes.getByViewer"] });
type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TEventTypeInputSchema;
};

export const compareMembership = (mship1: MembershipRole, mship2: MembershipRole) => {
  const mshipToNumber = (mship: MembershipRole) =>
    Object.keys(MembershipRole).findIndex((mmship) => mmship === mship);
  return mshipToNumber(mship1) > mshipToNumber(mship2);
};

export const getByViewerHandler = async ({ ctx, input }: GetByViewerOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `eventTypes:getByViewer:${ctx.user.id}`,
    rateLimitingType: "common",
  });
  const lightProfile = ctx.user.profile;
  const profile = await ProfileRepository.findByUpId(lightProfile.upId);
  const parentOrgHasLockedEventTypes =
    profile?.organization?.organizationSettings?.lockEventTypeCreationForUsers;
  const isFilterSet = input?.filters && hasFilter(input.filters);
  const isUpIdInFilter = input?.filters?.upIds?.includes(lightProfile.upId);

  let shouldListUserEvents = !isFilterSet || isUpIdInFilter;
  // FIX: Handles the case when an upId != lightProfile - pretend like there is no filter.
  // Results in {"eventTypeGroups":[],"profiles":[]} - this crashes all dependencies.
  if (isFilterSet && input?.filters?.upIds && !isUpIdInFilter) {
    shouldListUserEvents = true;
  }
  const [profileMemberships, profileEventTypes] = await Promise.all([
    MembershipRepository.findAllByUpIdIncludeTeamWithMembersAndEventTypes(
      {
        upId: lightProfile.upId,
      },
      {
        where: {
          accepted: true,
        },
      }
    ),
    shouldListUserEvents
      ? EventTypeRepository.findAllByUpId(
          {
            upId: lightProfile.upId,
            userId: ctx.user.id,
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

  const memberships = profileMemberships.map((membership) => ({
    ...membership,
    team: {
      ...membership.team,
      metadata: teamMetadataSchema.parse(membership.team.metadata),
    },
  }));

  log.debug(
    safeStringify({
      profileMemberships,
      profileEventTypes,
    })
  );

  type UserEventTypes = (typeof profileEventTypes)[number];

  const mapEventType = async (eventType: UserEventTypes) => ({
    ...eventType,
    safeDescription: eventType?.description ? markdownToSafeHTML(eventType.description) : undefined,
    users: await Promise.all(
      (!!eventType?.hosts?.length ? eventType?.hosts.map((host) => host.user) : eventType.users).map(
        async (u) =>
          await UserRepository.enrichUserWithItsProfile({
            user: u,
          })
      )
    ),
    metadata: eventType.metadata ? EventTypeMetaDataSchema.parse(eventType.metadata) : null,
    children: await Promise.all(
      (eventType.children || []).map(async (c) => ({
        ...c,
        users: await Promise.all(
          c.users.map(
            async (u) =>
              await UserRepository.enrichUserWithItsProfile({
                user: u,
              })
          )
        ),
      }))
    ),
  });

  const userEventTypes = (await Promise.all(profileEventTypes.map(mapEventType))).filter((eventType) => {
    const isAChildEvent = eventType.parentId;
    // A child event only has one user
    const childEventAssignee = eventType.users[0];
    if (isAChildEvent && childEventAssignee.id != ctx.user.id) {
      return false;
    }
    return true;
  });

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
    eventTypes: typeof userEventTypes;
  };

  let eventTypeGroups: EventTypeGroup[] = [];

  const unmanagedEventTypes = userEventTypes.filter(
    (evType) => evType.schedulingType !== SchedulingType.MANAGED
  );

  log.debug(safeStringify({ profileMemberships, profileEventTypes, profile }));

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
          username: profile.username,
          avatarUrl: profile.avatarUrl,
          profile: profile,
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

  const teamMemberships = profileMemberships.map((membership) => ({
    teamId: membership.team.id,
    membershipRole: membership.role,
  }));

  const filterTeamsEventTypesBasedOnInput = async (eventType: Awaited<ReturnType<typeof mapEventType>>) => {
    if (!input?.filters || !hasFilter(input?.filters)) {
      return true;
    }
    return input?.filters?.teamIds?.includes(eventType?.teamId || 0) ?? false;
  };
  eventTypeGroups = ([] as EventTypeGroup[]).concat(
    eventTypeGroups,
    await Promise.all(
      memberships
        .filter((mmship) => {
          if (mmship.team.isOrganization) {
            return false;
          } else {
            if (!input?.filters || !hasFilter(input?.filters)) {
              return true;
            }
            return input?.filters?.teamIds?.includes(mmship?.team?.id || 0) ?? false;
          }
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

          if (input?.forRoutingForms) {
            // For Routing form we want to ensure that after migration of team to an org, the URL remains same for the team
            // Once we solve this https://github.com/calcom/cal.com/issues/12399, we can remove this conditional change in slug
            slug = `team/${team.slug}`;
          } else {
            // In an Org, a team can be accessed without /team prefix as well as with /team prefix
            slug = team.slug ? (!team.parentId ? `team/${team.slug}` : `${team.slug}`) : null;
          }

          const eventTypes = await Promise.all(team.eventTypes.map(mapEventType));
          return {
            teamId: team.id,
            parentId: team.parentId,
            bookerUrl: getBookerBaseUrlSync(team.parent?.slug ?? null),
            membershipRole:
              orgMembership && compareMembership(orgMembership, membership.role)
                ? orgMembership
                : membership.role,
            profile: {
              image: team.parentId
                ? getOrgAvatarUrl({
                    slug: team.parent?.slug || null,
                    logoUrl: team.parent?.logoUrl,
                    requestedSlug: team.slug,
                  })
                : getTeamAvatarUrl({
                    slug: team.slug,
                    logoUrl: team.logoUrl,
                    requestedSlug: team.metadata?.requestedSlug ?? null,
                    organizationId: team.parentId,
                  }),
              name: team.name,
              slug,
            },
            metadata: {
              membershipCount: team.members.length,
              readOnly:
                membership.role ===
                (team.parentId
                  ? orgMembership && compareMembership(orgMembership, membership.role)
                    ? orgMembership
                    : MembershipRole.MEMBER
                  : MembershipRole.MEMBER),
            },
            eventTypes: eventTypes
              .filter(filterTeamsEventTypesBasedOnInput)
              .filter((evType) => {
                const res = evType.userId === null || evType.userId === ctx.user.id;
                return res;
              })
              .filter((evType) =>
                membership.role === MembershipRole.MEMBER
                  ? evType.schedulingType !== SchedulingType.MANAGED
                  : true
              ),
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
