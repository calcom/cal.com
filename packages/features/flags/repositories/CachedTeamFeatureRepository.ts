import type { TeamFeatures } from "@calcom/prisma/client";

import type { FeatureId, FeatureState, TeamFeatures as TeamFeaturesMap } from "../config";
import type { IPrismaTeamFeatureRepository } from "./PrismaTeamFeatureRepository";
import type { IRedisTeamFeatureRepository } from "./RedisTeamFeatureRepository";

export interface ICachedTeamFeatureRepositoryDeps {
  prismaRepo: IPrismaTeamFeatureRepository;
  redisRepo: IRedisTeamFeatureRepository;
}

export interface ICachedTeamFeatureRepository {
  findByTeamId(teamId: number): Promise<TeamFeatures[]>;
  findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<TeamFeatures | null>;
  findEnabledByTeamId(teamId: number): Promise<TeamFeaturesMap | null>;
  findByFeatureIdWhereEnabled(featureId: FeatureId): Promise<number[]>;
  findByTeamIdsAndFeatureIds(
    teamIds: number[],
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, Record<number, FeatureState>>>>;
  checkIfTeamHasFeature(teamId: number, featureId: FeatureId): Promise<boolean>;
  upsert(teamId: number, featureId: FeatureId, enabled: boolean, assignedBy: string): Promise<TeamFeatures>;
  delete(teamId: number, featureId: FeatureId): Promise<void>;
  findAutoOptInByTeamIds(teamIds: number[]): Promise<Record<number, boolean>>;
  updateAutoOptIn(teamId: number, enabled: boolean): Promise<void>;
}

export class CachedTeamFeatureRepository implements ICachedTeamFeatureRepository {
  constructor(private deps: ICachedTeamFeatureRepositoryDeps) {}

  async findByTeamId(teamId: number): Promise<TeamFeatures[]> {
    return this.deps.prismaRepo.findByTeamId(teamId);
  }

  async findByTeamIdAndFeatureId(teamId: number, featureId: FeatureId): Promise<TeamFeatures | null> {
    const cached = await this.deps.redisRepo.findByTeamIdAndFeatureId(teamId, featureId);
    if (cached !== null) {
      return cached;
    }

    const result = await this.deps.prismaRepo.findByTeamIdAndFeatureId(teamId, featureId);
    if (result) {
      await this.deps.redisRepo.setByTeamIdAndFeatureId(teamId, featureId, result);
    }
    return result;
  }

  async findEnabledByTeamId(teamId: number): Promise<TeamFeaturesMap | null> {
    const cached = await this.deps.redisRepo.findEnabledByTeamId(teamId);
    if (cached !== null) {
      return cached;
    }

    const result = await this.deps.prismaRepo.findEnabledByTeamId(teamId);
    if (result) {
      await this.deps.redisRepo.setEnabledByTeamId(teamId, result);
    }
    return result;
  }

  async findByFeatureIdWhereEnabled(featureId: FeatureId): Promise<number[]> {
    return this.deps.prismaRepo.findByFeatureIdWhereEnabled(featureId);
  }

  async findByTeamIdsAndFeatureIds(
    teamIds: number[],
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, Record<number, FeatureState>>>> {
    const result: Partial<Record<FeatureId, Record<number, FeatureState>>> = {};
    const cacheMisses: Array<{ teamId: number; featureId: FeatureId }> = [];

    const cacheKeys = teamIds.flatMap((teamId) =>
      featureIds.map((featureId) => ({ teamId, featureId }))
    );

    const cachedResults = await Promise.all(
      cacheKeys.map(async ({ teamId, featureId }) => {
        const cached = await this.deps.redisRepo.findByTeamIdAndFeatureId(teamId, featureId);
        return { teamId, featureId, cached };
      })
    );

    for (const { teamId, featureId, cached } of cachedResults) {
      if (cached !== null) {
        if (!result[featureId]) {
          result[featureId] = {};
        }
        result[featureId]![teamId] = cached.enabled ? "enabled" : "disabled";
      } else {
        cacheMisses.push({ teamId, featureId });
      }
    }

    if (cacheMisses.length > 0) {
      const missedTeamIds = [...new Set(cacheMisses.map((m) => m.teamId))];
      const missedFeatureIds = [...new Set(cacheMisses.map((m) => m.featureId))];

      const dbResults = await this.deps.prismaRepo.findByTeamIdsAndFeatureIds(missedTeamIds, missedFeatureIds);

      const dbResultsMap = new Map(
        dbResults.map((tf) => [`${tf.teamId}:${tf.featureId}`, tf])
      );

      await Promise.all(
        cacheMisses.map(async ({ teamId, featureId }) => {
          const teamFeature = dbResultsMap.get(`${teamId}:${featureId}`);
          if (!result[featureId]) {
            result[featureId] = {};
          }
          if (teamFeature) {
            result[featureId]![teamId] = teamFeature.enabled ? "enabled" : "disabled";
            await this.deps.redisRepo.setByTeamIdAndFeatureId(teamId, featureId, teamFeature);
          }
        })
      );
    }

    return result;
  }

  async checkIfTeamHasFeature(teamId: number, featureId: FeatureId): Promise<boolean> {
    return this.deps.prismaRepo.checkIfTeamHasFeature(teamId, featureId);
  }

  async upsert(
    teamId: number,
    featureId: FeatureId,
    enabled: boolean,
    assignedBy: string
  ): Promise<TeamFeatures> {
    const result = await this.deps.prismaRepo.upsert(teamId, featureId, enabled, assignedBy);
    await this.deps.redisRepo.invalidateByTeamIdAndFeatureId(teamId, featureId);
    return result;
  }

  async delete(teamId: number, featureId: FeatureId): Promise<void> {
    await this.deps.prismaRepo.delete(teamId, featureId);
    await this.deps.redisRepo.invalidateByTeamIdAndFeatureId(teamId, featureId);
  }

  async findAutoOptInByTeamIds(teamIds: number[]): Promise<Record<number, boolean>> {
    const cached = await this.deps.redisRepo.findAutoOptInByTeamIds(teamIds);
    if (cached !== null) {
      return cached;
    }

    const result = await this.deps.prismaRepo.findAutoOptInByTeamIds(teamIds);
    await this.deps.redisRepo.setAutoOptInByTeamIds(result, teamIds);
    return result;
  }

  async updateAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    await this.deps.prismaRepo.updateAutoOptIn(teamId, enabled);
    await this.deps.redisRepo.invalidateAutoOptIn([teamId]);
  }
}
