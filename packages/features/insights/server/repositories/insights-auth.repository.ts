import type { Prisma } from "@prisma/client";

import { readonlyPrisma as prisma } from "@calcom/prisma";

type RoutingFormInsightsTeamFilter = {
  userId?: number | null;
  teamId?: number | null;
  isAll: boolean;
  organizationId?: number | null;
  routingFormId?: string | null;
};

type WhereForTeamOrAllTeams = Prisma.App_RoutingForms_FormWhereInput;

// Repository class for handling authentication and team access logic for insights.
export class InsightsAuthRepository {
  // Gets accessible team IDs for a user within an organization
  static async getAccessibleTeamIds({
    userId,
    organizationId,
  }: {
    userId: number | null;
    organizationId: number;
  }): Promise<number[]> {
    if (userId === null) {
      return [];
    }

    const teamsFromOrg = await prisma.team.findMany({
      where: {
        parentId: organizationId,
      },
      select: {
        id: true,
      },
    });

    const teamIds = [organizationId, ...teamsFromOrg.map((t) => t.id)];

    // Filter teamIds to only include teams the user has access to
    const accessibleTeams = await prisma.membership.findMany({
      where: {
        userId: userId,
        teamId: {
          in: teamIds,
        },
        accepted: true,
      },
      select: {
        teamId: true,
      },
    });

    return accessibleTeams.map((membership) => membership.teamId);
  }

  // Gets accessible team IDs for a specific team
  static async getAccessibleTeamIdsForTeam({
    userId,
    teamId,
  }: {
    userId: number | null;
    teamId: number;
  }): Promise<number[]> {
    if (userId === null) {
      return [];
    }

    const accessibleTeams = await prisma.membership.findMany({
      where: {
        userId: userId,
        teamId: teamId,
        accepted: true,
      },
      select: {
        teamId: true,
      },
    });

    return accessibleTeams.map((membership) => membership.teamId);
  }

  // Builds the where clause for routing form queries based on team access
  static async getWhereForTeamOrAllTeams({
    userId,
    teamId,
    isAll,
    organizationId,
    routingFormId,
  }: RoutingFormInsightsTeamFilter): Promise<WhereForTeamOrAllTeams> {
    // Get team IDs based on organization if applicable
    let teamIds: number[] = [];

    if (isAll && organizationId) {
      teamIds = await this.getAccessibleTeamIds({ userId: userId ?? null, organizationId });
    } else if (teamId) {
      teamIds = await this.getAccessibleTeamIdsForTeam({ userId: userId ?? null, teamId });
    }

    const formsWhereCondition: WhereForTeamOrAllTeams = {};

    if (teamIds.length > 0) {
      formsWhereCondition.teamId = {
        in: teamIds,
      };
    } else {
      if (userId !== null) {
        formsWhereCondition.userId = userId;
      }
      formsWhereCondition.teamId = undefined;
    }

    if (routingFormId) {
      formsWhereCondition.id = routingFormId;
    }

    return formsWhereCondition;
  }
}
