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
      const now = new Date();
      return { userId, featureId, enabled: cached, assignedBy: "", assignedAt: now, updatedAt: now };
    }

    const result = await this.deps.prismaRepo.findByUserIdAndFeatureId(userId, featureId);
    if (result) {
      await this.deps.redisRepo.setByUserIdAndFeatureId(userId, featureId, result.enabled);
    }
    return result;
  }

  async findByUserIdAndFeatureIds(
    userId: number,
    featureIds: FeatureId[]
  ): Promise<Partial<Record<FeatureId, FeatureState>>> {
    const cached = await this.deps.redisRepo.findByUserIdAndFeatureIds(userId, featureIds);
    if (cached !== null) {
      return cached;
    }

    const result = await this.deps.prismaRepo.findByUserIdAndFeatureIds(userId, featureIds);
    await this.deps.redisRepo.setByUserIdAndFeatureIds(userId, featureIds, result);
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
    await this.deps.redisRepo.invalidateByUserId(userId);
    return result;
  }

  async delete(userId: number, featureId: FeatureId): Promise<void> {
    await this.deps.prismaRepo.delete(userId, featureId);
    await this.deps.redisRepo.invalidateByUserId(userId);
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
