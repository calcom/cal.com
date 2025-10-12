import { z } from "zod";

import { getAppFromSlug } from "@calcom/app-store/utils";
import { DATABASE_CHUNK_SIZE } from "@calcom/lib/constants";
import { getBookerBaseUrlSync } from "@calcom/features/ee/organizations/lib/getBookerBaseUrlSync";
import { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTeam, getOrg } from "@calcom/lib/server/repository/team";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { Team } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { baseEventTypeSelect } from "@calcom/prisma/selects";
import {
  EventTypeMetaDataSchema,
  allManagedEventTypeProps,
  unlockedManagedEventTypeProps,
  eventTypeLocations,
} from "@calcom/prisma/zod-utils";
import { EventTypeSchema } from "@calcom/prisma/zod/modelSchema/EventTypeSchema";

export type TeamWithMembers = Awaited<ReturnType<typeof getTeamWithMembers>>;

export async function getTeamWithMembers(args: {
  id?: number;
  slug?: string;
  userId?: number;
  orgSlug?: string | null;
  isTeamView?: boolean;
  currentOrg?: Pick<Team, "id"> | null;
  /**
   * If true, means that you are fetching an organization and not a team
   */
  isOrgView?: boolean;
}) {
  const { id, slug, currentOrg: _currentOrg, userId, orgSlug, isTeamView, isOrgView } = args;

  // This should improve performance saving already app data found.
  const appDataMap = new Map();
  const userSelect = {
    username: true,
    email: true,
    name: true,
    avatarUrl: true,
    id: true,
    bio: true,
    teams: {
      select: {
        team: {
          select: {
            slug: true,
            id: true,
          },
        },
      },
    },
    credentials: {
      select: {
        app: {
          select: {
            slug: true,
            categories: true,
          },
        },
        destinationCalendars: {
          select: {
            externalId: true,
          },
        },
      },
    },
  } satisfies Prisma.UserSelect;
  let lookupBy;

  if (id) {
    lookupBy = { id, havingMemberWithId: userId };
  } else if (slug) {
    lookupBy = { slug, havingMemberWithId: userId };
  } else {
    throw new Error("Must provide either id or slug");
  }

  const arg = {
    lookupBy,
    forOrgWithSlug: orgSlug ?? null,
    isOrg: !!isOrgView,
    teamSelect: {
      id: true,
      name: true,
      slug: true,
      isOrganization: true,
      logoUrl: true,
      bio: true,
      hideBranding: true,
      hideBookATeamMember: true,
      isPrivate: true,
      metadata: true,
      parent: {
        select: {
          id: true,
          slug: true,
          name: true,
          isPrivate: true,
          isOrganization: true,
          logoUrl: true,
          metadata: true,
          organizationSettings: {
            select: {
              allowSEOIndexing: true,
              orgProfileRedirectsToVerifiedDomain: true,
              orgAutoAcceptEmail: true,
            },
          },
        },
      },
      parentId: true,
      children: {
        select: {
          name: true,
          slug: true,
        },
      },
      members: {
        select: {
          accepted: true,
          role: true,
          disableImpersonation: true,
          user: {
            select: userSelect,
          },
        },
      },
      theme: true,
      brandColor: true,
      darkBrandColor: true,
      eventTypes: {
        where: {
          hidden: false,
          schedulingType: {
            not: SchedulingType.MANAGED,
          },
        },
        orderBy: [
          {
            position: "desc",
          },
          {
            id: "asc",
          },
        ] as Prisma.EventTypeOrderByWithRelationInput[],
        select: {
          hosts: {
            select: {
              user: {
                select: userSelect,
              },
            },
          },
          metadata: true,
          ...baseEventTypeSelect,
        },
      },
      inviteTokens: {
        select: {
          token: true,
          expires: true,
          expiresInDays: true,
          identifier: true,
        },
      },
      organizationSettings: {
        select: {
          allowSEOIndexing: true,
          orgProfileRedirectsToVerifiedDomain: true,
          orgAutoAcceptEmail: true,
        },
      },
    },
  } as const;

  const teamOrOrg = isOrgView ? await getOrg(arg) : await getTeam(arg);

  if (!teamOrOrg) return null;

  const teamOrOrgMemberships = [];
  const userRepo = new UserRepository(prisma);
  for (const membership of teamOrOrg.members) {
    teamOrOrgMemberships.push({
      ...membership,
      user: await userRepo.enrichUserWithItsProfile({
        user: membership.user,
      }),
    });
  }
  const members = teamOrOrgMemberships.map((m) => {
    const { credentials, profile, ...restUser } = m.user;
    return {
      ...restUser,
      username: profile?.username ?? restUser.username,
      role: m.role,
      profile: profile,
      organizationId: profile?.organizationId ?? null,
      organization: profile?.organization,
      accepted: m.accepted,
      disableImpersonation: m.disableImpersonation,
      subteams: orgSlug
        ? m.user.teams
            .filter((membership) => membership.team.id !== teamOrOrg.id)
            .map((membership) => membership.team.slug)
        : null,
      bookerUrl: getBookerBaseUrlSync(profile?.organization?.slug || ""),
      connectedApps: !isTeamView
        ? credentials?.map((cred) => {
            const appSlug = cred.app?.slug;
            let appData = appDataMap.get(appSlug);

            if (!appData) {
              appData = getAppFromSlug(appSlug);
              appDataMap.set(appSlug, appData);
            }

            const isCalendar = cred?.app?.categories?.includes("calendar") ?? false;
            const externalId = isCalendar ? cred.destinationCalendars?.[0]?.externalId : null;
            return {
              name: appData?.name ?? null,
              logo: appData?.logo ?? null,
              app: cred.app,
              externalId: externalId ?? null,
            };
          })
        : null,
    };
  });

  const eventTypesWithUsersUserProfile = [];
  for (const eventType of teamOrOrg.eventTypes) {
    const usersWithUserProfile = [];
    for (const { user } of eventType.hosts) {
      usersWithUserProfile.push(
        await userRepo.enrichUserWithItsProfile({
          user,
        })
      );
    }
    eventTypesWithUsersUserProfile.push({
      ...eventType,
      users: usersWithUserProfile,
    });
  }
  const eventTypes = eventTypesWithUsersUserProfile.map((eventType) => ({
    ...eventType,
    metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
  }));

  // Don't leak invite tokens to the frontend
  const { inviteTokens, ...teamWithoutInviteTokens } = teamOrOrg;

  // Don't leak stripe payment ids
  const teamMetadata = teamOrOrg.metadata;
  const {
    paymentId: _,
    subscriptionId: __,
    subscriptionItemId: ___,
    ...restTeamMetadata
  } = teamMetadata || {};

  return {
    ...teamWithoutInviteTokens,
    ...(teamWithoutInviteTokens.logoUrl ? { logo: teamWithoutInviteTokens.logoUrl } : {}),
    /** To prevent breaking we only return non-email attached token here, if we have one */
    inviteToken: inviteTokens.find(
      (token) =>
        token.identifier === `invite-link-for-teamId-${teamOrOrg.id}` &&
        token.expires > new Date(new Date().setHours(24))
    ),
    metadata: restTeamMetadata,
    eventTypes: !isOrgView ? eventTypes : null,
    members,
  };
}

export async function getTeamWithoutMembers(args: {
  id?: number;
  slug?: string;
  userId?: number;
  orgSlug?: string | null;
  /**
   * If true, means that you are fetching an organization and not a team
   */
  isOrgView?: boolean;
}) {
  const { id, slug, userId, orgSlug, isOrgView } = args;

  let lookupBy;

  if (id) {
    lookupBy = { id, havingMemberWithId: userId };
  } else if (slug) {
    lookupBy = { slug, havingMemberWithId: userId };
  } else {
    throw new Error("Must provide either id or slug");
  }

  const arg = {
    lookupBy,
    forOrgWithSlug: orgSlug ?? null,
    isOrg: !!isOrgView,
    teamSelect: {
      id: true,
      name: true,
      slug: true,
      isOrganization: true,
      logoUrl: true,
      bio: true,
      hideBranding: true,
      hideBookATeamMember: true,
      hideTeamProfileLink: true,
      isPrivate: true,
      metadata: true,
      bookingLimits: true,
      rrResetInterval: true,
      rrTimestampBasis: true,
      includeManagedEventsInLimits: true,
      parent: {
        select: {
          id: true,
          slug: true,
          name: true,
          isPrivate: true,
          isOrganization: true,
          logoUrl: true,
          metadata: true,
        },
      },
      parentId: true,
      children: {
        select: {
          name: true,
          slug: true,
        },
      },
      theme: true,
      brandColor: true,
      darkBrandColor: true,
      inviteTokens: {
        select: {
          token: true,
          expires: true,
          expiresInDays: true,
          identifier: true,
        },
      },
    },
  } as const;

  const teamOrOrg = isOrgView ? await getOrg(arg) : await getTeam(arg);

  if (!teamOrOrg) return null;

  // Don't leak invite tokens to the frontend
  const { inviteTokens, ...teamWithoutInviteTokens } = teamOrOrg;

  // Don't leak stripe payment ids
  const teamMetadata = teamOrOrg.metadata;
  const {
    paymentId: _,
    subscriptionId: __,
    subscriptionItemId: ___,
    ...restTeamMetadata
  } = teamMetadata || {};

  return {
    ...teamWithoutInviteTokens,
    ...(teamWithoutInviteTokens.logoUrl ? { logo: teamWithoutInviteTokens.logoUrl } : {}),
    /** To prevent breaking we only return non-email attached token here, if we have one */
    inviteToken: inviteTokens.find(
      (token) =>
        token.identifier === `invite-link-for-teamId-${teamOrOrg.id}` &&
        token.expires > new Date(new Date().setHours(24))
    ),
    metadata: restTeamMetadata,
    bookingLimits: parseBookingLimit(teamOrOrg.bookingLimits),
  };
}

export async function isTeamOwner(userId: number, teamId: number) {
  return !!(await prisma.membership.findFirst({
    where: {
      userId,
      teamId,
      accepted: true,
      role: "OWNER",
    },
  }));
}

export async function isTeamMember(userId: number, teamId: number) {
  return !!(await prisma.membership.findFirst({
    where: {
      userId,
      teamId,
      accepted: true,
    },
  }));
}

export function generateNewChildEventTypeDataForDB({
  eventType,
  userId,
  includeWorkflow = true,
  includeUserConnect = true,
}: {
  eventType: Omit<
    Prisma.EventTypeGetPayload<{ select: typeof allManagedEventTypeProps & { id: true } }>,
    "locations"
  > & { locations: Prisma.JsonValue | null };
  userId: number;
  includeWorkflow?: boolean;
  includeUserConnect?: boolean;
}) {
  const allManagedEventTypePropsZod = EventTypeSchema.pick(allManagedEventTypeProps).extend({
    bookingFields: EventTypeSchema.shape.bookingFields.nullish(),
    locations: z
      .preprocess((val: unknown) => (val === null ? undefined : val), eventTypeLocations)
      .optional(),
  });

  const managedEventTypeValues = allManagedEventTypePropsZod
    .omit(unlockedManagedEventTypeProps)
    .parse(eventType);

  // Define the values for unlocked properties to use on creation, not updation
  const unlockedEventTypeValues = allManagedEventTypePropsZod
    .pick(unlockedManagedEventTypeProps)
    .parse(eventType);

  // Calculate if there are new workflows for which assigned members will get too
  const currentWorkflowIds = Array.isArray(eventType.workflows)
    ? eventType.workflows.map((wf) => wf.workflowId)
    : [];

  return {
    ...managedEventTypeValues,
    ...unlockedEventTypeValues,
    bookingLimits: (managedEventTypeValues.bookingLimits as unknown as Prisma.InputJsonObject) ?? undefined,
    recurringEvent: (managedEventTypeValues.recurringEvent as unknown as Prisma.InputJsonValue) ?? undefined,
    metadata: (managedEventTypeValues.metadata as Prisma.InputJsonValue) ?? undefined,
    bookingFields: (managedEventTypeValues.bookingFields as Prisma.InputJsonValue) ?? undefined,
    durationLimits: (managedEventTypeValues.durationLimits as Prisma.InputJsonValue) ?? undefined,
    eventTypeColor: (managedEventTypeValues.eventTypeColor as Prisma.InputJsonValue) ?? undefined,
    rrSegmentQueryValue: (managedEventTypeValues.rrSegmentQueryValue as Prisma.InputJsonValue) ?? undefined,
    onlyShowFirstAvailableSlot: managedEventTypeValues.onlyShowFirstAvailableSlot ?? false,
    userId,
    ...(includeUserConnect && {
      users: {
        connect: [{ id: userId }],
      },
    }),
    parentId: eventType.id,
    hidden: false,
    ...(includeWorkflow && {
      workflows: currentWorkflowIds && {
        create: currentWorkflowIds.map((wfId) => ({ workflowId: wfId })),
      },
    }),
  };
}

async function getEventTypesToAddNewMembers(teamId: number) {
  return await prisma.eventType.findMany({
    where: {
      team: { id: teamId },
      assignAllTeamMembers: true,
    },
    select: {
      ...allManagedEventTypeProps,
      id: true,
      schedulingType: true,
    },
  });
}

export async function updateNewTeamMemberEventTypes(userId: number, teamId: number) {
  const eventTypesToAdd = await getEventTypesToAddNewMembers(teamId);

  eventTypesToAdd.length > 0 &&
    (await prisma.$transaction(
      eventTypesToAdd.map((eventType) => {
        if (eventType.schedulingType === "MANAGED") {
          return prisma.eventType.create({
            data: generateNewChildEventTypeDataForDB({
              eventType,
              userId,
            }),
          });
        } else {
          return prisma.eventType.update({
            where: { id: eventType.id },
            data: { hosts: { create: [{ userId, isFixed: eventType.schedulingType === "COLLECTIVE" }] } },
          });
        }
      })
    ));
}

export async function addNewMembersToEventTypes({ userIds, teamId }: { userIds: number[]; teamId: number }) {
  const log = logger.getSubLogger({
    prefix: ["addNewMembersToEventTypes"],
  });

  const eventTypesToAdd = await getEventTypesToAddNewMembers(teamId);

  const managedEventTypes = eventTypesToAdd.filter((eventType) => eventType.schedulingType === "MANAGED");
  const teamEventTypes = eventTypesToAdd.filter((eventType) => eventType.schedulingType !== "MANAGED");

  await Promise.allSettled([
    prisma.eventType
      .createMany({
        data: managedEventTypes
          .map((eventType) =>
            userIds.map((userId) =>
              generateNewChildEventTypeDataForDB({
                eventType,
                userId,
                includeWorkflow: false,
                includeUserConnect: false,
              })
            )
          )
          .flat(),
        skipDuplicates: true,
      })
      .catch((error) => {
        log.error(
          `Failed to add new members to managed event types`,
          safeStringify({
            teamId,
            error,
          })
        );
      }),
    prisma.host
      .createMany({
        data: teamEventTypes
          .map((eventType) => {
            return userIds.map((userId) => {
              return {
                userId,
                eventTypeId: eventType.id,
                isFixed: eventType.schedulingType === "COLLECTIVE",
              };
            });
          })
          .flat(),
        skipDuplicates: true,
      })
      .catch((error) => {
        log.error(
          `Failed to add new members as hosts`,
          safeStringify({
            teamId,
            error,
          })
        );
      }),
  ]);

  // Connect to users and workflows
  const createdChildrenEventTypes = await prisma.eventType.findMany({
    where: {
      userId: {
        in: userIds,
      },
      parent: {
        id: {
          in: managedEventTypes.map((eventType) => eventType.id),
        },
      },
    },
    select: {
      id: true,
      userId: true,
      workflows: {
        select: {
          id: true,
        },
      },
    },
  });

  if (createdChildrenEventTypes.length > 0) {
    await Promise.allSettled([
      prisma.workflowsOnEventTypes
        .createMany({
          data: createdChildrenEventTypes
            .map((eventType) =>
              eventType.workflows.map((workflow) => ({
                eventTypeId: eventType.id,
                workflowId: workflow.id,
              }))
            )
            .flat(),
          skipDuplicates: true,
        })
        .catch((error) => {
          log.error(
            `Failed to connect new children event types to workflows`,
            safeStringify({
              teamId,
              error,
            })
          );
        }),
    ]);
    // Connect children event types to users
    for (let i = 0; i < createdChildrenEventTypes.length; i += DATABASE_CHUNK_SIZE) {
      const childrenEventTypeBatch = createdChildrenEventTypes.slice(i, i + DATABASE_CHUNK_SIZE);

      await Promise.allSettled([
        childrenEventTypeBatch.map((childEventType) => {
          if (!childEventType.userId) return;
          return prisma.eventType
            .update({
              where: {
                id: childEventType.id,
              },
              data: {
                users: {
                  connect: [{ id: childEventType.userId }],
                },
              },
            })
            .catch((error) => {
              log.error(
                `Failed to connect new children event types to users`,
                safeStringify({
                  teamId,
                  childEventTypeId: childEventType.id,
                  userId: childEventType.userId,
                  error,
                })
              );
            });
        }),
      ]);
    }
  }
}
