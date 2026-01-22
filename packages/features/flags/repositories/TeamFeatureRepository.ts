import { Memoize, Unmemoize } from "@calcom/features/cache";
import type { TeamFeaturesDto } from "@calcom/lib/dto/TeamFeaturesDto";
import { TeamFeaturesDtoSchema } from "@calcom/lib/dto/TeamFeaturesDto";
import type { PrismaClient } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";

import type { FeatureId, FeatureState, TeamFeatures } from "../config";
import { booleanSchema } from "./schemas";

const CACHE_PREFIX = "features:team";
const KEY = {
  byTeamIdAndFeatureId: (teamId: number, featureId: string): string =>
    `${CACHE_PREFIX}:${teamId}:${featureId}`,
  autoOptInByTeamId: (teamId: number): string => `${CACHE_PREFIX}:autoOptIn:${teamId}`,
};

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
  getTeamsWithFeatureEnabled(featureId: FeatureId): Promise<number[]>;
  getEnabledTeamFeatures(teamId: number): Promise<TeamFeatures | null>;
  getTeamsFeatureStates(
    teamIds: number[],
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, Record<number, FeatureState>>>>;
  setState(
    input:
      | { teamId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { teamId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void>;
}

export class TeamFeatureRepository implements ITeamFeatureRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  @Memoize({
    key: (teamId: number, featureId: FeatureId) => KEY.byTeamIdAndFeatureId(teamId, featureId),
    schema: TeamFeaturesDtoSchema,
  })
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

  @Unmemoize({
    keys: (teamId: number, featureId: FeatureId) => [KEY.byTeamIdAndFeatureId(teamId, featureId)],
  })
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

  @Unmemoize({
    keys: (teamId: number, featureId: FeatureId) => [KEY.byTeamIdAndFeatureId(teamId, featureId)],
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
  async setAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    await this.prisma.team.update({
      where: { id: teamId },
      data: { autoOptInFeatures: enabled },
    });
  }

  async checkIfTeamHasFeature(teamId: number, featureId: FeatureId): Promise<boolean> {
    const teamFeature = await this.findByTeamIdAndFeatureId(teamId, featureId);
    if (teamFeature) return teamFeature.enabled;

    const query = Prisma.sql`
      WITH RECURSIVE TeamHierarchy AS (
        -- Start with the initial team
        SELECT id, "parentId",
          CASE WHEN EXISTS (
            SELECT 1 FROM "TeamFeatures" tf
            WHERE tf."teamId" = id AND tf."featureId" = ${featureId} AND tf."enabled" = true
          ) THEN true ELSE false END as has_feature
        FROM "Team"
        WHERE id = ${teamId}

        UNION ALL

        -- Recursively get parent teams
        SELECT p.id, p."parentId",
          CASE WHEN EXISTS (
            SELECT 1 FROM "TeamFeatures" tf
            WHERE tf."teamId" = p.id AND tf."featureId" = ${featureId} AND tf."enabled" = true
          ) THEN true ELSE false END as has_feature
        FROM "Team" p
        INNER JOIN TeamHierarchy c ON p.id = c."parentId"
        WHERE NOT c.has_feature -- Stop recursion if we found a team with the feature
      )
      SELECT 1
      FROM TeamHierarchy
      WHERE has_feature = true
      LIMIT 1;
    `;

    const result = await this.prisma.$queryRaw<unknown[]>(query);
    return result.length > 0;
  }

  async getTeamsWithFeatureEnabled(featureId: FeatureId): Promise<number[]> {
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

  async getEnabledTeamFeatures(teamId: number): Promise<TeamFeatures | null> {
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

  async getTeamsFeatureStates(
    teamIds: number[],
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, Record<number, FeatureState>>>> {
    if (teamIds.length === 0 || featureIds.length === 0) {
      return {};
    }

    const result: Partial<Record<FeatureId, Record<number, FeatureState>>> = {};
    for (const featureId of featureIds) {
      result[featureId] = {};
    }

    const teamFeatures = await this.prisma.teamFeatures.findMany({
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

  @Unmemoize({
    keys: (input: { teamId: number; featureId: FeatureId }) => [
      KEY.byTeamIdAndFeatureId(input.teamId, input.featureId),
    ],
  })
  async setState(
    input:
      | { teamId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { teamId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    const { teamId, featureId, state } = input;

    if (state === "enabled" || state === "disabled") {
      const { assignedBy } = input;
      await this.prisma.teamFeatures.upsert({
        where: {
          teamId_featureId: {
            teamId,
            featureId,
          },
        },
        create: {
          teamId,
          featureId,
          enabled: state === "enabled",
          assignedBy,
        },
        update: {
          enabled: state === "enabled",
          assignedBy,
        },
      });
    } else if (state === "inherit") {
      await this.prisma.teamFeatures.deleteMany({
        where: {
          teamId,
          featureId,
        },
      });
    }
  }
}
