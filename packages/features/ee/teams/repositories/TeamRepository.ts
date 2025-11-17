import type { z } from "zod";

import { whereClauseForOrgWithSlugOrRequestedSlug } from "@calcom/ee/organizations/lib/orgDomains";
import logger from "@calcom/lib/logger";
import { getParsedTeam } from "@calcom/lib/server/repository/teamUtils";
import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

type TeamGetPayloadWithParsedMetadata<TeamSelect extends Prisma.TeamSelect> =
  | (Omit<Prisma.TeamGetPayload<{ select: TeamSelect }>, "metadata" | "isOrganization"> & {
      metadata: z.infer<typeof teamMetadataSchema>;
      isOrganization: boolean;
    })
  | null;

type GetTeamOrOrgArg<TeamSelect extends Prisma.TeamSelect> = {
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
  teamSelect: TeamSelect;
};

const log = logger.getSubLogger({ prefix: ["repository", "team"] });

/**
 * Gets the team or organization with the given slug or id reliably along with parsed metadata.
 */
async function getTeamOrOrg<TeamSelect extends Prisma.TeamSelect>({
  lookupBy,
  forOrgWithSlug: forOrgWithSlug,
  isOrg,
  teamSelect,
}: GetTeamOrOrgArg<TeamSelect>): Promise<TeamGetPayloadWithParsedMetadata<TeamSelect>> {
  const where: Prisma.TeamFindFirstArgs["where"] = {};
  teamSelect = {
    ...teamSelect,
    metadata: true,
    isOrganization: true,
  } satisfies TeamSelect;
  if (lookupBy.havingMemberWithId) where.members = { some: { userId: lookupBy.havingMemberWithId } };

  if ("id" in lookupBy) {
    where.id = lookupBy.id;
  } else {
    where.slug = lookupBy.slug;
  }

  if (isOrg) {
    where.isOrganization = true;
  } else {
    if (forOrgWithSlug) {
      where.parent = whereClauseForOrgWithSlugOrRequestedSlug(forOrgWithSlug);
    }
  }

  log.debug({
    orgSlug: forOrgWithSlug,
    teamLookupBy: lookupBy,
    isOrgView: isOrg,
    where,
  });

  const teams = await prisma.team.findMany({
    where,
    select: teamSelect,
  });

  const teamsWithParsedMetadata = teams
    .map((team) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore ts types are way too complciated for this now
      const parsedMetadata = teamMetadataSchema.parse(team.metadata ?? {});
      return {
        ...team,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore It does exist
        isOrganization: team.isOrganization as boolean,
        metadata: parsedMetadata,
      };
    })
    .filter((team) => {
      return isOrg ? team.isOrganization : !team.isOrganization;
    });

  if (teamsWithParsedMetadata.length > 1) {
    log.error("Found more than one team/Org. We should be doing something wrong.", {
      isOrgView: isOrg,
      where,
      teams: teamsWithParsedMetadata.map((team) => {
        const t = team as unknown as { id: number; slug: string };
        return {
          id: t.id,
          slug: t.slug,
        };
      }),
    });
  }

  const team = teamsWithParsedMetadata[0];
  if (!team) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return team as any;
}

export async function getTeam<TeamSelect extends Prisma.TeamSelect>({
  lookupBy,
  forOrgWithSlug: forOrgWithSlug,
  teamSelect,
}: Omit<GetTeamOrOrgArg<TeamSelect>, "isOrg">): Promise<TeamGetPayloadWithParsedMetadata<TeamSelect>> {
  return getTeamOrOrg({
    lookupBy,
    forOrgWithSlug: forOrgWithSlug,
    isOrg: false,
    teamSelect,
  });
}

export async function getOrg<TeamSelect extends Prisma.TeamSelect>({
  lookupBy,
  forOrgWithSlug: forOrgWithSlug,
  teamSelect,
}: Omit<GetTeamOrOrgArg<TeamSelect>, "isOrg">): Promise<TeamGetPayloadWithParsedMetadata<TeamSelect>> {
  return getTeamOrOrg({
    lookupBy,
    forOrgWithSlug: forOrgWithSlug,
    isOrg: true,
    teamSelect,
  });
}

const teamSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  parentId: true,
  metadata: true,
  isOrganization: true,
  organizationSettings: true,
  isPlatform: true,
} satisfies Prisma.TeamSelect;

const teamWithMembersSelect = {
  members: {
    select: {
      accepted: true,
    },
  },
  id: true,
  metadata: true,
  parentId: true,
  isOrganization: true,
} satisfies Prisma.TeamSelect;

const teamWithParentSelect = {
  parent: {
    select: {
      id: true,
      isOrganization: true,
      organizationSettings: true,
    },
  },
} satisfies Prisma.TeamSelect;

const teamForUserSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  isOrganization: true,
  metadata: true,
  inviteTokens: true,
  parent: true,
  parentId: true,
} satisfies Prisma.TeamSelect;

const teamForCreditCheckSelect = {
  id: true,
  isOrganization: true,
  parentId: true,
  parent: { select: { id: true } },
} satisfies Prisma.TeamSelect;

export class TeamRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findById({ id }: { id: number }) {
    const team = await this.prismaClient.team.findUnique({
      where: { id },
      select: teamSelect,
    });
    if (!team) {
      return null;
    }
    return getParsedTeam(team);
  }

  async findByIdIncludePlatformBilling({ id }: { id: number }) {
    const team = await this.prismaClient.team.findUnique({
      where: { id },
      select: { ...teamSelect, platformBilling: true },
    });
    if (!team) {
      return null;
    }
    return getParsedTeam(team);
  }

  async findTeamSlugById({ id }: { id: number }) {
    return await this.prismaClient.team.findUnique({
      where: { id },
      select: { slug: true },
    });
  }

  async deleteById({ id }: { id: number }) {
    const deletedTeam = await this.prismaClient.$transaction(async (tx) => {
      await tx.eventType.deleteMany({
        where: {
          teamId: id,
          schedulingType: "MANAGED",
        },
      });

      await tx.membership.deleteMany({
        where: {
          teamId: id,
        },
      });

      const deletedTeam = await tx.team.delete({
        where: { id },
      });

      return deletedTeam;
    });

    return deletedTeam;
  }

  async findAllByParentId({
    parentId,
    select = DEFAULT_TEAM_SELECT,
  }: {
    parentId: number;
    select?: Prisma.TeamSelect;
  }) {
    return await this.prismaClient.team.findMany({
      where: { parentId },
      select,
    });
  }

  async findByIdAndParentId({
    id,
    parentId,
    select = DEFAULT_TEAM_SELECT,
  }: {
    id: number;
    parentId: number;
    select?: Prisma.TeamSelect;
  }) {
    return await this.prismaClient.team.findFirst({
      where: { id, parentId },
      select,
    });
  }

  async findOrgTeamsExcludingTeam({ parentId, excludeTeamId }: { parentId: number; excludeTeamId: number }) {
    return await this.prismaClient.team.findMany({
      where: {
        parentId,
        id: { not: excludeTeamId },
      },
      select: { id: true },
    });
  }

  async findParentOrganizationByTeamId(teamId: number) {
    const team = await this.prismaClient.team.findUnique({
      where: { id: teamId },
      select: {
        parent: {
          select: {
            id: true,
          },
        },
      },
    });

    return team?.parent;
  }

  async findTeamWithOrganizationSettings(teamId: number) {
    return await this.prismaClient.team.findUnique({
      where: { id: teamId },
      select: teamWithParentSelect,
    });
  }

  async findTeamWithParentHideBranding({ teamId }: { teamId: number }) {
    return await this.prismaClient.team.findUnique({
      where: { id: teamId },
      select: {
        hideBranding: true,
        parent: {
          select: {
            hideBranding: true,
          },
        },
      },
    });
  }

  async findFirstBySlugAndParentSlug({
    slug,
    parentSlug,
    select = DEFAULT_TEAM_SELECT,
  }: {
    slug: string;
    parentSlug: string | null;
    select?: Prisma.TeamSelect;
  }) {
    return await this.prismaClient.team.findFirst({
      where: {
        slug,
        parent: parentSlug ? whereClauseForOrgWithSlugOrRequestedSlug(parentSlug) : null,
      },
      select,
    });
  }

  async isSlugAvailableForUpdate({
    slug,
    teamId,
    parentId,
  }: {
    slug: string;
    teamId: number;
    parentId?: number | null;
  }) {
    const whereClause: Prisma.TeamWhereInput = {
      slug: {
        equals: slug,
        mode: "insensitive",
      },
      parentId: parentId ?? null,
      NOT: { id: teamId },
    };

    const conflictingTeam = await this.prismaClient.team.findFirst({
      where: whereClause,
      select: { id: true },
    });

    return !conflictingTeam;
  }

  async findTeamsByUserId({ userId, includeOrgs }: { userId: number; includeOrgs?: boolean }) {
    const memberships = await this.prismaClient.membership.findMany({
      where: {
        userId,
      },
      include: {
        team: {
          select: teamForUserSelect,
        },
      },
      orderBy: { role: "desc" },
    });

    return memberships
      .filter((membership) => {
        if (includeOrgs) return true;
        return !membership.team.isOrganization;
      })
      .map(({ team: { inviteTokens, ...team }, ...membership }) => ({
        role: membership.role,
        accepted: membership.accepted,
        ...team,
        metadata: teamMetadataSchema.parse(team.metadata),
        inviteToken: inviteTokens.find((token) => token.identifier === `invite-link-for-teamId-${team.id}`),
      }));
  }

  async findTeamWithMembers(teamId: number) {
    return await this.prismaClient.team.findUnique({
      where: { id: teamId },
      select: teamWithMembersSelect,
    });
  }

  async findOrganization({ teamId, userId }: { teamId?: number; userId: number }) {
    return await this.prismaClient.team.findFirst({
      where: {
        isOrganization: true,
        children: {
          some: {
            id: teamId,
          },
        },
        members: {
          some: {
            userId,
            accepted: true,
          },
        },
      },
      select: {
        id: true,
      },
    });
  }

  async getTeamByIdIfUserIsAdmin({ userId, teamId }: { userId: number; teamId: number }) {
    return await this.prismaClient.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        metadata: true,
        members: {
          where: {
            userId,
            role: {
              in: [MembershipRole.ADMIN, MembershipRole.OWNER],
            },
          },
        },
      },
    });
  }

  async findOrganizationSettingsBySlug({ slug }: { slug: string }) {
    return await this.prismaClient.team.findFirst({
      where: {
        slug,
        isOrganization: true,
      },
      select: {
        organizationSettings: {
          select: {
            adminGetsNoSlotsNotification: true,
          },
        },
      },
    });
  }

  async findTeamMembersWithPermission({
    teamId,
    permission,
    fallbackRoles,
  }: {
    teamId: number;
    permission: string;
    fallbackRoles: MembershipRole[];
  }) {
    const { resource, action } = this.parsePermission(permission);

    type UserResult = {
      id: number;
      name: string | null;
      email: string;
      locale: string | null;
    };

    const users = await this.prismaClient.$queryRaw<UserResult[]>`
      SELECT DISTINCT u.id, u.name, u.email, u.locale
      FROM "Membership" m
      INNER JOIN "User" u ON m."userId" = u.id
      LEFT JOIN "Role" r ON m."customRoleId" = r.id
      LEFT JOIN "TeamFeatures" f ON m."teamId" = f."teamId" AND f."featureId" = 'pbac'
      WHERE m."teamId" = ${teamId}
        AND m."accepted" = true
        AND (
          -- Scenario 1: PBAC enabled + custom role with permission
          (f."teamId" IS NOT NULL
           AND m."customRoleId" IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM "RolePermission" rp
             WHERE rp."roleId" = r.id
               AND (
                 (rp."resource" = '*' AND rp."action" = '*') OR
                 (rp."resource" = ${resource} AND rp."action" = ${action}) OR
                 (rp."resource" = ${resource} AND rp."action" = '*') OR
                 (rp."resource" = '*' AND rp."action" = ${action})
               )
           ))
          OR
          -- Scenario 2 & 3: Legacy role ADMIN/OWNER (works for both PBAC and non-PBAC teams)
          (m."role"::text = ANY(${fallbackRoles}))
        )
    `;

    return users;
  }

  async findTeamsForCreditCheck({ teamIds }: { teamIds: number[] }) {
    return await this.prismaClient.team.findMany({
      where: { id: { in: teamIds } },
      select: teamForCreditCheckSelect,
    });
  }

  private parsePermission(permission: string): { resource: string; action: string } {
    const lastDotIndex = permission.lastIndexOf(".");
    const resource = permission.substring(0, lastDotIndex);
    const action = permission.substring(lastDotIndex + 1);
    return { resource, action };
  }
}
