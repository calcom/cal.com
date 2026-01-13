import type { PrismaClient, TeamFeatures } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";

import type { FeatureId, FeatureState, TeamFeatures as TeamFeaturesMap } from "../config";

export interface IPrismaTeamFeatureRepository {
  findByTeamId(teamId: number): Promise<TeamFeatures[]>;
  findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<TeamFeatures | null>;
  findEnabledByTeamId(teamId: number): Promise<TeamFeaturesMap | null>;
  findByFeatureIdWhereEnabled(featureId: FeatureId): Promise<number[]>;
  findByTeamIdsAndFeatureIds(
    teamIds: number[],
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, Record<number, FeatureState>>>>;
  checkIfTeamHasFeature(teamId: number, featureId: FeatureId): Promise<boolean>;
  upsert(
    teamId: number,
    featureId: FeatureId,
    enabled: boolean,
    assignedBy: string
  ): Promise<TeamFeatures>;
  delete(teamId: number, featureId: FeatureId): Promise<void>;
  findAutoOptInByTeamIds(teamIds: number[]): Promise<Record<number, boolean>>;
  updateAutoOptIn(teamId: number, enabled: boolean): Promise<void>;
}

export class PrismaTeamFeatureRepository implements IPrismaTeamFeatureRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findByTeamId(teamId: number): Promise<TeamFeatures[]> {
    return this.prismaClient.teamFeatures.findMany({
      where: { teamId },
    });
  }

  async findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<TeamFeatures | null> {
    return this.prismaClient.teamFeatures.findUnique({
      where: {
        teamId_featureId: {
          teamId,
          featureId,
        },
      },
    });
  }

  async findEnabledByTeamId(teamId: number): Promise<TeamFeaturesMap | null> {
    const result = await this.prismaClient.teamFeatures.findMany({
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

    const features: TeamFeaturesMap = Object.fromEntries(
      result.map((teamFeature) => [teamFeature.feature.slug, true])
    ) as TeamFeaturesMap;

    return features;
  }

  async findByFeatureIdWhereEnabled(featureId: FeatureId): Promise<number[]> {
    const rows = await this.prismaClient.teamFeatures.findMany({
      where: {
        featureId,
        enabled: true,
      },
      select: { teamId: true },
      orderBy: { teamId: "asc" },
    });

    return rows.map((r) => r.teamId);
  }

  async findByTeamIdsAndFeatureIds(
    teamIds: number[],
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, Record<number, FeatureState>>>> {
    if (teamIds.length === 0 || featureIds.length === 0) {
      return {} as Partial<Record<FeatureId, Record<number, FeatureState>>>;
    }

    const result: Partial<Record<FeatureId, Record<number, FeatureState>>> = {};
    for (const featureId of featureIds) {
      result[featureId] = {};
    }

    const teamFeatures = await this.prismaClient.teamFeatures.findMany({
      where: {
        teamId: { in: teamIds },
        featureId: { in: featureIds },
      },
      select: { teamId: true, featureId: true, enabled: true },
    });

    for (const teamFeature of teamFeatures) {
      const featureStates = result[teamFeature.featureId as FeatureId] ?? {};
      featureStates[teamFeature.teamId] = teamFeature.enabled ? "enabled" : "disabled";
      result[teamFeature.featureId as FeatureId] = featureStates;
    }

    return result;
  }

  async checkIfTeamHasFeature(teamId: number, featureId: FeatureId): Promise<boolean> {
    const teamFeature = await this.findByTeamIdAndFeatureId(teamId, featureId);
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

    const result = await this.prismaClient.$queryRaw<unknown[]>(query);
    return result.length > 0;
  }

  async upsert(
    teamId: number,
    featureId: FeatureId,
    enabled: boolean,
    assignedBy: string
  ): Promise<TeamFeatures> {
    return this.prismaClient.teamFeatures.upsert({
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
  }

  async delete(teamId: number, featureId: FeatureId): Promise<void> {
    await this.prismaClient.teamFeatures.deleteMany({
      where: {
        teamId,
        featureId,
      },
    });
  }

  async findAutoOptInByTeamIds(teamIds: number[]): Promise<Record<number, boolean>> {
    if (teamIds.length === 0) {
      return {};
    }

    const teams = await this.prismaClient.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, autoOptInFeatures: true },
    });

    const result: Record<number, boolean> = {};
    for (const team of teams) {
      result[team.id] = team.autoOptInFeatures;
    }
    return result;
  }

  async updateAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    await this.prismaClient.team.update({
      where: { id: teamId },
      data: { autoOptInFeatures: enabled },
    });
  }
}
