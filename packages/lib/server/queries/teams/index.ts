import { Prisma } from "@prisma/client";

import { getAppFromSlug } from "@calcom/app-store/utils";
import { getSlugOrRequestedSlug } from "@calcom/ee/organizations/lib/orgDomains";
import prisma, { baseEventTypeSelect } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema, teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { WEBAPP_URL } from "../../../constants";

export type TeamWithMembers = Awaited<ReturnType<typeof getTeamWithMembers>>;

export async function getTeamWithMembers(args: {
  id?: number;
  slug?: string;
  userId?: number;
  orgSlug?: string | null;
  includeTeamLogo?: boolean;
  isTeamView?: boolean;
  isOrgView?: boolean;
}) {
  const { id, slug, userId, orgSlug, isTeamView, isOrgView, includeTeamLogo } = args;
  const userSelect = Prisma.validator<Prisma.UserSelect>()({
    username: true,
    email: true,
    name: true,
    id: true,
    bio: true,
    teams: {
      select: {
        team: {
          select: {
            slug: true,
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
  });
  const teamSelect = Prisma.validator<Prisma.TeamSelect>()({
    id: true,
    name: true,
    slug: true,
    ...(!!includeTeamLogo ? { logo: true } : {}),
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
      },
    },
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
      select: {
        users: {
          select: userSelect,
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
  });

  const where: Prisma.TeamFindFirstArgs["where"] = {};

  if (userId) where.members = { some: { userId } };
  if (orgSlug && orgSlug !== slug) {
    where.parent = getSlugOrRequestedSlug(orgSlug);
  }
  if (id) where.id = id;
  if (slug) where.slug = slug;

  const team = await prisma.team.findFirst({
    where,
    select: teamSelect,
  });

  if (!team) return null;

  // This should improve performance saving already app data found.
  const appDataMap = new Map();
  const members = team.members.map((obj) => {
    const { credentials, ...restUser } = obj.user;
    return {
      ...restUser,
      role: obj.role,
      accepted: obj.accepted,
      disableImpersonation: obj.disableImpersonation,
      subteams: orgSlug
        ? obj.user.teams.filter((obj) => obj.team.slug !== orgSlug).map((obj) => obj.team.slug)
        : null,
      avatar: `${WEBAPP_URL}/${obj.user.username}/avatar.png`,
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

  const eventTypes = team.eventTypes.map((eventType) => ({
    ...eventType,
    metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
  }));
  // Don't leak invite tokens to the frontend
  const { inviteTokens, ...teamWithoutInviteTokens } = team;

  // Don't leak stripe payment ids
  const teamMetadata = teamMetadataSchema.parse(team.metadata);
  const {
    paymentId: _,
    subscriptionId: __,
    subscriptionItemId: ___,
    ...restTeamMetadata
  } = teamMetadata || {};

  return {
    ...teamWithoutInviteTokens,
    /** To prevent breaking we only return non-email attached token here, if we have one */
    inviteToken: inviteTokens.find(
      (token) =>
        token.identifier === `invite-link-for-teamId-${team.id}` &&
        token.expires > new Date(new Date().setHours(24))
    ),
    metadata: restTeamMetadata,
    eventTypes: !isOrgView ? eventTypes : null,
    members,
  };
}

// also returns team
export async function isTeamAdmin(userId: number, teamId: number) {
  return (
    (await prisma.membership.findFirst({
      where: {
        userId,
        teamId,
        accepted: true,
        OR: [{ role: "ADMIN" }, { role: "OWNER" }],
      },
    })) || false
  );
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
