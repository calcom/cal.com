import type { PrismaClient, TeamFeatures } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";
import { Memoize } from "../../cache/decorators/Memoize";
import { Unmemoize } from "../../cache/decorators/Unmemoize";
import type { FeatureId, TeamFeatures as TeamFeaturesMap } from "../config";
import { booleanSchema, teamFeaturesMapSchema, teamFeaturesSchema } from "./schemas";

const CACHE_PREFIX = "features:team";
const KEY = {
  byTeamIdAndFeatureId: (teamId: number, featureId: string): string =>
    `${CACHE_PREFIX}:${teamId}:${featureId}`,
  enabledByTeamId: (teamId: number): string => `${CACHE_PREFIX}:enabled:${teamId}`,
  autoOptInByTeamId: (teamId: number): string => `${CACHE_PREFIX}:autoOptIn:${teamId}`,
};

export interface ITeamFeatureRepository {
  findByTeamId(teamId: number): Promise<TeamFeatures[]>;
  findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<TeamFeatures | null>;
  findEnabledByTeamId(teamId: number): Promise<TeamFeaturesMap | null>;
  findByFeatureIdWhereEnabled(featureId: FeatureId): Promise<number[]>;
  findByTeamIdsAndFeatureIds(
    teamIds: number[],
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, Record<number, TeamFeatures>>>>;
  checkIfTeamHasFeature(teamId: number, featureId: FeatureId): Promise<boolean>;
  upsert(teamId: number, featureId: FeatureId, enabled: boolean, assignedBy: string): Promise<TeamFeatures>;
  delete(teamId: number, featureId: FeatureId): Promise<void>;
  findAutoOptInByTeamId(teamId: number): Promise<boolean>;
  findAutoOptInByTeamIds(teamIds: number[]): Promise<Record<number, boolean>>;
  updateAutoOptIn(teamId: number, enabled: boolean): Promise<void>;
}

export class TeamFeatureRepository implements ITeamFeatureRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByTeamId(teamId: number): Promise<TeamFeatures[]> {
    return this.prisma.teamFeatures.findMany({
      where: { teamId },
    });
  }

  @Memoize({
    key: (teamId: number, featureId: FeatureId) => KEY.byTeamIdAndFeatureId(teamId, featureId),
    schema: teamFeaturesSchema,
  })
  async findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<TeamFeatures | null> {
    return this.prisma.teamFeatures.findUnique({
      where: {
        teamId_featureId: {
          teamId,
          featureId,
        },
      },
    });
  }

  @Memoize({
    key: (teamId: number) => KEY.enabledByTeamId(teamId),
    schema: teamFeaturesMapSchema,
  })
  async findEnabledByTeamId(teamId: number): Promise<TeamFeaturesMap | null> {
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

    const features: TeamFeaturesMap = Object.fromEntries(
      result.map((teamFeature) => [teamFeature.feature.slug, true])
    ) as TeamFeaturesMap;

    return features;
  }

  async findByFeatureIdWhereEnabled(featureId: FeatureId): Promise<number[]> {
    const rows = await this.prisma.teamFeatures.findMany({
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
  ): Promise<Partial<Record<FeatureId, Record<number, TeamFeatures>>>> {
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

    const result: Partial<Record<FeatureId, Record<number, TeamFeatures>>> = {};
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

    const result = await this.prisma.$queryRaw<unknown[]>(query);
    return result.length > 0;
  }

  @Unmemoize({
    keys: (teamId: number, featureId: FeatureId) => [
      KEY.byTeamIdAndFeatureId(teamId, featureId),
      KEY.enabledByTeamId(teamId),
    ],
  })
  async upsert(
    teamId: number,
    featureId: FeatureId,
    enabled: boolean,
    assignedBy: string
  ): Promise<TeamFeatures> {
    return this.prisma.teamFeatures.upsert({
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

  @Unmemoize({
    keys: (teamId: number, featureId: FeatureId) => [
      KEY.byTeamIdAndFeatureId(teamId, featureId),
      KEY.enabledByTeamId(teamId),
    ],
  })
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

  @Memoize({
    key: (teamId: number) => KEY.autoOptInByTeamId(teamId),
    schema: booleanSchema,
  })
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

  @Unmemoize({
    keys: (teamId: number) => [KEY.autoOptInByTeamId(teamId)],
  })
  async updateAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    await this.prisma.team.update({
      where: { id: teamId },
      data: { autoOptInFeatures: enabled },
    });
  }
}
