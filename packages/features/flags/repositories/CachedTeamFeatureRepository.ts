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
      const now = new Date();
      return { teamId, featureId, enabled: cached, assignedBy: "", assignedAt: now, updatedAt: now };
    }

    const result = await this.deps.prismaRepo.findByTeamIdAndFeatureId(teamId, featureId);
    if (result) {
      await this.deps.redisRepo.setByTeamIdAndFeatureId(teamId, featureId, result.enabled);
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
    const cached = await this.deps.redisRepo.findByTeamIdsAndFeatureIds(teamIds, featureIds);
    if (cached !== null) {
      return cached;
    }

    const result = await this.deps.prismaRepo.findByTeamIdsAndFeatureIds(teamIds, featureIds);
    await this.deps.redisRepo.setByTeamIdsAndFeatureIds(result, teamIds, featureIds);
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
    await this.deps.redisRepo.invalidateByTeamId(teamId);
    return result;
  }

  async delete(teamId: number, featureId: FeatureId): Promise<void> {
    await this.deps.prismaRepo.delete(teamId, featureId);
    await this.deps.redisRepo.invalidateByTeamId(teamId);
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
