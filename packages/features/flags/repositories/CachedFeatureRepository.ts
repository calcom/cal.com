import type { Feature } from "@calcom/prisma/client";

import type { AppFlags, FeatureId } from "../config";
import type { IPrismaFeatureRepository } from "./PrismaFeatureRepository";
import type { IRedisFeatureRepository } from "./RedisFeatureRepository";

export interface ICachedFeatureRepositoryDeps {
  prismaRepo: IPrismaFeatureRepository;
  redisRepo: IRedisFeatureRepository;
}

export interface ICachedFeatureRepository {
  findAll(): Promise<Feature[]>;
  findBySlug(slug: FeatureId): Promise<Feature | null>;
  checkIfEnabledGlobally(slug: FeatureId): Promise<boolean>;
  getFeatureFlagMap(): Promise<AppFlags>;
}

export class CachedFeatureRepository implements ICachedFeatureRepository {
  constructor(private deps: ICachedFeatureRepositoryDeps) {}

  async findAll(): Promise<Feature[]> {
    const cached = await this.deps.redisRepo.findAll();
    if (cached !== null) {
      return cached;
    }

    const result = await this.deps.prismaRepo.findAll();
    await this.deps.redisRepo.setAll(result);
    return result;
  }

  async findBySlug(slug: FeatureId): Promise<Feature | null> {
    const cached = await this.deps.redisRepo.findBySlug(slug);
    if (cached !== null) {
      return cached;
    }

    const result = await this.deps.prismaRepo.findBySlug(slug);
    if (result) {
      await this.deps.redisRepo.setBySlug(slug, result);
    }
    return result;
  }

  async checkIfEnabledGlobally(slug: FeatureId): Promise<boolean> {
    const feature = await this.findBySlug(slug);
    return Boolean(feature && feature.enabled);
  }

  async getFeatureFlagMap(): Promise<AppFlags> {
    const cached = await this.deps.redisRepo.getFeatureFlagMap();
    if (cached !== null) {
      return cached;
    }

    const result = await this.deps.prismaRepo.getFeatureFlagMap();
    await this.deps.redisRepo.setFeatureFlagMap(result);
    return result;
  }
}
