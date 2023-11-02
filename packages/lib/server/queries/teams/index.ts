import type { Membership } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { z } from "zod";

import { getAppFromSlug } from "@calcom/app-store/utils";
import {
  getOrgFullOrigin,
  whereClauseForOrgWithSlugOrRequestedSlug,
} from "@calcom/ee/organizations/lib/orgDomains";
import prisma, { baseEventTypeSelect } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema, teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { WEBAPP_URL } from "../../../constants";
import logger from "../../../logger";

const log = logger.getSubLogger({ prefix: ["queries", "teams"] });
export type TeamWithMembers = Awaited<ReturnType<typeof getTeamWithMembers>>;

export async function getTeamWithMembers(args: {
  id?: number;
  slug?: string;
  userId?: number;
  orgSlug?: string | null;
  includeTeamLogo?: boolean;
  isTeamView?: boolean;
  /**
   * If true, means that you are fetching an organization and not a team
   */
  getOrgOnly?: boolean;
}) {
  const { id, slug, userId, orgSlug, isTeamView, getOrgOnly: isOrgView, includeTeamLogo } = args;

  // This should improve performance saving already app data found.
  const appDataMap = new Map();
  const userSelect = Prisma.validator<Prisma.UserSelect>()({
    username: true,
    email: true,
    name: true,
    id: true,
    bio: true,
    organizationId: true,
    organization: {
      select: {
        slug: true,
      },
    },
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
  let lookupBy;

  if (id) {
    lookupBy = { id, havingMemberWithId: userId };
  } else if (slug) {
    lookupBy = { slug, havingMemberWithId: userId };
  } else {
    throw new Error("Must provide either id or slug");
  }

  const team = await getTeamOrOrg({
    lookupBy,
    forOrgWithSlug: orgSlug ?? null,
    isOrg: !!isOrgView,
    includeTeamLogo,
    teamSelect: {
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
    },
  });

  if (!team) return null;

  const members = team.members.map((obj) => {
    // We need to do type assertion here because Prisma and TypeScript aren't playing well together and TS complains that obj doesn't have user.
    const m = obj as Membership & { user: Prisma.UserGetPayload<{ select: typeof userSelect }> };
    if (m.user === undefined) throw new Error("team.members.[0].user must be selected");

    const { credentials, ...restUser } = m.user;
    return {
      ...restUser,
      role: obj.role,
      accepted: obj.accepted,
      disableImpersonation: obj.disableImpersonation,
      subteams: orgSlug
        ? m.user.teams
            .filter((membership) => membership.team.slug !== orgSlug)
            .map((membership) => membership.team.slug)
        : null,
      avatar: `${WEBAPP_URL}/${m.user.username}/avatar.png`,
      orgOrigin: getOrgFullOrigin(m.user.organization?.slug || ""),
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
  const teamMetadata = team.metadata;
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

async function getTeamOrOrg<TeamSel extends Prisma.TeamSelect>({
  lookupBy,
  forOrgWithSlug: forOrgWithSlug,
  isOrg,
  teamSelect,
}: {
  lookupBy: (
    | {
        id: number;
      }
    | {
        slug: string;
      }
  ) & {
    havingMemberWithId?: number;
  };
  /**
   * If we are fetching a team, this is the slug of the organization that the team belongs to.
   */
  forOrgWithSlug: string | null;
  /**
   * If true, means that we need to fetch an organization with the given slug. Otherwise, we need to fetch a team with the given slug.
   */
  isOrg: boolean;
  teamSelect: TeamSel;
}) : Promise<Omit<Prisma.TeamGetPayload<{select:TeamSel}>, 'metadata'> & {metadata: z.infer<typeof teamMetadataSchema>} | null>  {
  const where: Prisma.TeamFindFirstArgs["where"] = {};

  if (lookupBy.havingMemberWithId) where.members = { some: { userId: lookupBy.havingMemberWithId } };

  log.debug({
    orgSlug: forOrgWithSlug,
    teamLookupBy: lookupBy,
    isOrgView: isOrg,
    where,
  });

  if ("id" in lookupBy) {
    where.id = lookupBy.id;
  } else {
    where.slug = lookupBy.slug;
  }

  if (isOrg) {
    // We must fetch only the organization here.
    // Note that an organization and a team that doesn't belong to an organization, both have parentId null
    // If the organization has null slug(but requestedSlug is 'test') and the team also has slug 'test', we can't distinguish them without explicitly checking the metadata.isOrganization
    // Note that, this isn't possible now to have same requestedSlug as the slug of a team not part of an organization. This is legacy teams handling mostly. But it is still safer to be sure that you are fetching an Organization only in case of isOrgView
    where.metadata = {
      path: ["isOrganization"],
      equals: true,
    };
    // We must fetch only the team here.
  } else {
    if (forOrgWithSlug) {
      where.parent = whereClauseForOrgWithSlugOrRequestedSlug(forOrgWithSlug);
    }
  }

  const teams = await prisma.team.findMany({
    where,
    select: teamSelect,
  });

  const teamsWithParsedMetadata = teams
    .map((team) => ({
      ...team,
      // Using Type assertion here because we know that the metadata is present and Prisma and TypeScript aren't playing well together
      metadata: teamMetadataSchema.parse((team as {metadata: z.infer<typeof teamMetadataSchema>}).metadata),
    }))
    // In cases where there are many teams with the same slug, we need to find out the one and only one that matches our criteria
    .filter((team) => {
      // We need an org if isOrgView otherwise we need a team
      return isOrg ? team.metadata?.isOrganization : !team.metadata?.isOrganization;
    });

  if (teamsWithParsedMetadata.length > 1) {
    log.error("Found more than one team/Org. We should be doing something wrong.", {
      isOrgView: isOrg,
      where,
      teams: teamsWithParsedMetadata.map((team) => {
        const t = team as unknown as { id: number; slug: string }
        return {
          id: t.id,
          slug: t.slug,
        };
      }),
    });
  }

  const team = teamsWithParsedMetadata[0];
  if (!team) return null;
  // HACK: I am not sure how to make Prisma in peace with TypeScript with this repository pattern
  return team as any
}
