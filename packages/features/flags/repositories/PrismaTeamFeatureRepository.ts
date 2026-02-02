import { captureException } from "@sentry/nextjs";

import type { TeamFeaturesDto } from "@calcom/lib/dto/TeamFeaturesDto";
import type { PrismaClient } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";

import type { FeatureId, TeamFeatures } from "../config";

export interface ITeamFeatureRepository {
  findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<TeamFeaturesDto | null>;
  findByTeamIdsAndFeatureIds(
    teamIds: number[],
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, Record<number, TeamFeaturesDto>>>>;
  upsert(
    teamId: number,
    featureId: FeatureId,
    enabled: boolean,
    assignedBy: string
  ): Promise<TeamFeaturesDto>;
  delete(teamId: number, featureId: FeatureId): Promise<void>;
  findAutoOptInByTeamId(teamId: number): Promise<boolean>;
  findAutoOptInByTeamIds(teamIds: number[]): Promise<Record<number, boolean>>;
  setAutoOptIn(teamId: number, enabled: boolean): Promise<void>;
  checkIfTeamHasFeature(teamId: number, featureId: FeatureId): Promise<boolean>;
  getEnabledFeatures(teamId: number): Promise<TeamFeatures | null>;
}

export class PrismaTeamFeatureRepository implements ITeamFeatureRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<TeamFeaturesDto | null> {
    const result = await this.prisma.teamFeatures.findUnique({
      where: {
        teamId_featureId: {
          teamId,
          featureId,
        },
      },
    });
    if (!result) return null;
    return this.toDto(result);
  }

  async findByTeamIdsAndFeatureIds(
    teamIds: number[],
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, Record<number, TeamFeaturesDto>>>> {
    if (teamIds.length === 0 || featureIds.length === 0) {
      return {};
    }

    const results = await Promise.all(
      teamIds.flatMap((teamId) =>
        featureIds.map(async (featureId) => {
          const teamFeature = await this.findByTeamIdAndFeatureId(teamId, featureId);
          return { teamId, featureId, teamFeature };
        })
      )
    );

    const result: Partial<Record<FeatureId, Record<number, TeamFeaturesDto>>> = {};
    for (const { teamId, featureId, teamFeature } of results) {
      if (teamFeature !== null) {
        if (!result[featureId]) {
          result[featureId] = {};
        }
        const featureRecord = result[featureId];
        if (featureRecord) {
          featureRecord[teamId] = teamFeature;
        }
      }
    }

    return result;
  }

  async upsert(
    teamId: number,
    featureId: FeatureId,
    enabled: boolean,
    assignedBy: string
  ): Promise<TeamFeaturesDto> {
    const result = await this.prisma.teamFeatures.upsert({
      where: {
        teamId_featureId: {
          teamId,
          featureId,
        },
      },
      create: {
        teamId,
        featureId,
        enabled,
        assignedBy,
      },
      update: {
        enabled,
        assignedBy,
      },
    });
    return this.toDto(result);
  }

  private toDto(teamFeature: {
    teamId: number;
    featureId: string;
    enabled: boolean;
    assignedBy: string;
    updatedAt: Date;
  }): TeamFeaturesDto {
    return {
      teamId: teamFeature.teamId,
      featureId: teamFeature.featureId,
      enabled: teamFeature.enabled,
      assignedBy: teamFeature.assignedBy,
      updatedAt: teamFeature.updatedAt,
    };
  }

  async delete(teamId: number, featureId: FeatureId): Promise<void> {
    await this.prisma.teamFeatures.delete({
      where: {
        teamId_featureId: {
          teamId,
          featureId,
        },
      },
    });
  }

  async findAutoOptInByTeamId(teamId: number): Promise<boolean> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { autoOptInFeatures: true },
    });
    return team?.autoOptInFeatures ?? false;
  }

  async findAutoOptInByTeamIds(teamIds: number[]): Promise<Record<number, boolean>> {
    if (teamIds.length === 0) {
      return {};
    }

    const results = await Promise.all(
      teamIds.map(async (teamId) => {
        const autoOptIn = await this.findAutoOptInByTeamId(teamId);
        return { teamId, autoOptIn };
      })
    );

    const result: Record<number, boolean> = {};
    for (const { teamId, autoOptIn } of results) {
      result[teamId] = autoOptIn;
    }
    return result;
  }

  async setAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    await this.prisma.team.update({
      where: { id: teamId },
      data: { autoOptInFeatures: enabled },
    });
  }

  /**
   * Checks if a team or any of its ancestors has access to a specific feature.
   * Uses a recursive CTE raw SQL query for performance.
   * Uses tri-state semantics: only treats as enabled if TeamFeatures row exists AND enabled=true.
   */
  async checkIfTeamHasFeature(teamId: number, featureId: FeatureId): Promise<boolean> {
    try {
      const teamFeature = await this.prisma.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId,
            featureId,
          },
        },
        select: { enabled: true },
      });
      if (teamFeature) return teamFeature.enabled;

      const query = Prisma.sql`
        WITH RECURSIVE TeamHierarchy AS (
          SELECT id, "parentId",
            CASE WHEN EXISTS (
              SELECT 1 FROM "TeamFeatures" tf
              WHERE tf."teamId" = id AND tf."featureId" = ${featureId} AND tf."enabled" = true
            ) THEN true ELSE false END as has_feature
          FROM "Team"
          WHERE id = ${teamId}

          UNION ALL

          SELECT p.id, p."parentId",
            CASE WHEN EXISTS (
              SELECT 1 FROM "TeamFeatures" tf
              WHERE tf."teamId" = p.id AND tf."featureId" = ${featureId} AND tf."enabled" = true
            ) THEN true ELSE false END as has_feature
          FROM "Team" p
          INNER JOIN TeamHierarchy c ON p.id = c."parentId"
          WHERE NOT c.has_feature
        )
        SELECT 1
        FROM TeamHierarchy
        WHERE has_feature = true
        LIMIT 1;
      `;

      const result = await this.prisma.$queryRaw<unknown[]>(query);
      return result.length > 0;
    } catch (err) {
      captureException(err);
      console.error(
        `Recursive feature check failed for team ${teamId}, feature ${featureId}:`,
        err instanceof Error ? err.message : err
      );
      throw err;
    }
  }

  /**
   * Gets all features enabled for a specific team in a map format.
   */
  async getEnabledFeatures(teamId: number): Promise<TeamFeatures | null> {
    const result = await this.prisma.teamFeatures.findMany({
      where: {
        teamId,
        enabled: true,
      },
      select: {
        feature: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!result.length) return null;

    const features: TeamFeatures = Object.fromEntries(
      result.map((teamFeature) => [teamFeature.feature.slug, true])
    ) as TeamFeatures;

    return features;
  }
}
