import type { UserFeatures } from "@calcom/prisma/client";

import type { FeatureId, FeatureState } from "../config";
import type { IPrismaUserFeatureRepository } from "./PrismaUserFeatureRepository";
import type { IRedisUserFeatureRepository } from "./RedisUserFeatureRepository";

export interface ICachedUserFeatureRepositoryDeps {
  prismaRepo: IPrismaUserFeatureRepository;
  redisRepo: IRedisUserFeatureRepository;
}

export interface ICachedUserFeatureRepository {
  findByUserId(userId: number): Promise<UserFeatures[]>;
  findByUserIdAndFeatureId(userId: number, featureId: string): Promise<UserFeatures | null>;
  findByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, FeatureState>>>;
  checkIfUserBelongsToTeamWithFeature(userId: number, slug: string): Promise<boolean>;
  checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId: number, slug: string): Promise<boolean>;
  upsert(userId: number, featureId: FeatureId, enabled: boolean, assignedBy: string): Promise<UserFeatures>;
  delete(userId: number, featureId: FeatureId): Promise<void>;
  findAutoOptInByUserId(userId: number): Promise<boolean>;
  updateAutoOptIn(userId: number, enabled: boolean): Promise<void>;
}

export class CachedUserFeatureRepository implements ICachedUserFeatureRepository {
  constructor(private deps: ICachedUserFeatureRepositoryDeps) {}

  async findByUserId(userId: number): Promise<UserFeatures[]> {
    return this.deps.prismaRepo.findByUserId(userId);
  }

  async findByUserIdAndFeatureId(userId: number, featureId: string): Promise<UserFeatures | null> {
    const cached = await this.deps.redisRepo.findByUserIdAndFeatureId(userId, featureId);
    if (cached !== null) {
      return cached;
    }

    const result = await this.deps.prismaRepo.findByUserIdAndFeatureId(userId, featureId);
    if (result) {
      await this.deps.redisRepo.setByUserIdAndFeatureId(userId, featureId, result);
    }
    return result;
  }

  async findByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, FeatureState>>> {
    const result: Partial<Record<FeatureId, FeatureState>> = {};
    const cacheMisses: FeatureId[] = [];

    const cachedResults = await Promise.all(
      featureIds.map(async (featureId) => {
        const cached = await this.deps.redisRepo.findByUserIdAndFeatureId(userId, featureId);
        return { featureId, cached };
      })
    );

    for (const { featureId, cached } of cachedResults) {
      if (cached !== null) {
        result[featureId] = cached.enabled ? "enabled" : "disabled";
      } else {
        cacheMisses.push(featureId);
      }
    }

    if (cacheMisses.length > 0) {
      const dbResults = await this.deps.prismaRepo.findByUserIdAndFeatureIds(userId, cacheMisses);

      const dbResultsMap = new Map(dbResults.map((uf) => [uf.featureId as FeatureId, uf]));

      await Promise.all(
        cacheMisses.map(async (featureId) => {
          const userFeature = dbResultsMap.get(featureId);
          if (userFeature) {
            result[featureId] = userFeature.enabled ? "enabled" : "disabled";
            await this.deps.redisRepo.setByUserIdAndFeatureId(userId, featureId, userFeature);
          } else {
            result[featureId] = "inherit";
          }
        })
      );
    }

    return result;
  }

  async checkIfUserBelongsToTeamWithFeature(userId: number, slug: string): Promise<boolean> {
    return this.deps.prismaRepo.checkIfUserBelongsToTeamWithFeature(userId, slug);
  }

  async checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    return this.deps.prismaRepo.checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId, slug);
  }

  async upsert(
    userId: number,
    featureId: FeatureId,
    enabled: boolean,
    assignedBy: string
  ): Promise<UserFeatures> {
    const result = await this.deps.prismaRepo.upsert(userId, featureId, enabled, assignedBy);
    await this.deps.redisRepo.invalidateByUserIdAndFeatureId(userId, featureId);
    return result;
  }

  async delete(userId: number, featureId: FeatureId): Promise<void> {
    await this.deps.prismaRepo.delete(userId, featureId);
    await this.deps.redisRepo.invalidateByUserIdAndFeatureId(userId, featureId);
  }

  async findAutoOptInByUserId(userId: number): Promise<boolean> {
    const cached = await this.deps.redisRepo.findAutoOptInByUserId(userId);
    if (cached !== null) {
      return cached;
    }

    const result = await this.deps.prismaRepo.findAutoOptInByUserId(userId);
    await this.deps.redisRepo.setAutoOptInByUserId(userId, result);
    return result;
  }

  async updateAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    await this.deps.prismaRepo.updateAutoOptIn(userId, enabled);
    await this.deps.redisRepo.invalidateAutoOptIn(userId);
  }
}
