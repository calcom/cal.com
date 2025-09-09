import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { whereClauseForOrgWithSlugOrRequestedSlug } from "@calcom/ee/organizations/lib/orgDomains";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { getParsedTeam } from "./teamUtils";

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
    // We must fetch only the organization here.
    // Note that an organization and a team that doesn't belong to an organization, both have parentId null
    // If the organization has null slug(but requestedSlug is 'test') and the team also has slug 'test', we can't distinguish them without explicitly checking the metadata.isOrganization
    // Note that, this isn't possible now to have same requestedSlug as the slug of a team not part of an organization. This is legacy teams handling mostly. But it is still safer to be sure that you are fetching an Organization only in case of isOrgView
    where.isOrganization = true;
    // We must fetch only the team here.
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
    // In cases where there are many teams with the same slug, we need to find out the one and only one that matches our criteria
    .filter((team) => {
      // We need an org if isOrgView otherwise we need a team
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
  // HACK: I am not sure how to make Prisma in peace with TypeScript with this repository pattern
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

export class TeamRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findById({ id }: { id: number }) {
    const team = await this.prismaClient.team.findUnique({
      where: {
        id,
      },
      select: teamSelect,
    });
    if (!team) {
      return null;
    }
    return getParsedTeam(team);
  }

  async findAllByParentId({
    parentId,
    select = teamSelect,
  }: {
    parentId: number;
    select?: Prisma.TeamSelect;
  }) {
    return await this.prismaClient.team.findMany({
      where: {
        parentId,
      },
      select,
    });
  }

  async findByIdAndParentId({
    id,
    parentId,
    select = teamSelect,
  }: {
    id: number;
    parentId: number;
    select?: Prisma.TeamSelect;
  }) {
    return await this.prismaClient.team.findFirst({
      where: {
        id,
        parentId,
      },
      select,
    });
  }

  async findFirstBySlugAndParentSlug({
    slug,
    parentSlug,
    select = teamSelect,
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

  async deleteById({ id }: { id: number }) {
    const deletedTeam = await this.prismaClient.$transaction(async (tx) => {
      await tx.eventType.deleteMany({
        where: {
          teamId: id,
          schedulingType: "MANAGED",
        },
      });

      // delete all memberships
      await tx.membership.deleteMany({
        where: {
          teamId: id,
        },
      });

      const deletedTeam = await tx.team.delete({
        where: {
          id: id,
        },
      });

      return deletedTeam;
    });

    return deletedTeam;
  }

  async findTeamWithMembers(teamId: number) {
    return await this.prismaClient.team.findUnique({
      where: { id: teamId },
      select: {
        members: {
          select: {
            accepted: true,
          },
        },
        id: true,
        metadata: true,
        parentId: true,
        isOrganization: true,
      },
    });
  }

  async findTeamsByUserId({ userId, includeOrgs }: { userId: number; includeOrgs?: boolean }) {
    const memberships = await this.prismaClient.membership.findMany({
      where: {
        // Show all the teams this user belongs to regardless of the team being part of the user's org or not
        // We don't want to restrict in the listing here. If we need to restrict a situation where a user is part of the org along with being part of a non-org team, we should do that instead of filtering out from here
        // This became necessary when we started migrating user to Org, without migrating some teams of the user to the org
        // Also, we would allow a user to be part of multiple orgs, then also it would be necessary.
        userId: userId,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            isOrganization: true,
            metadata: true,
            inviteTokens: true,
            parent: true,
            parentId: true,
          },
        },
      },
      orderBy: { role: "desc" },
    });

    return memberships
      .filter((mmship) => {
        if (includeOrgs) return true;
        return !mmship.team.isOrganization;
      })
      .map(({ team: { inviteTokens, ...team }, ...membership }) => ({
        role: membership.role,
        accepted: membership.accepted,
        ...team,
        metadata: teamMetadataSchema.parse(team.metadata),
        /** To prevent breaking we only return non-email attached token here, if we have one */
        inviteToken: inviteTokens.find((token) => token.identifier === `invite-link-for-teamId-${team.id}`),
      }));
  }

  async findTeamWithOrganizationSettings(teamId: number) {
    return await this.prismaClient.team.findUnique({
      where: { id: teamId },
      select: {
        parent: {
          select: {
            isOrganization: true,
            organizationSettings: true,
          },
        },
      },
    });
  }
}
