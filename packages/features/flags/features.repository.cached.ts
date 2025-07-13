import { captureException } from "@sentry/nextjs";

import { RedisService } from "@calcom/features/redis/RedisService";

import type { AppFlags } from "./config";
import { FeaturesRepository } from "./features.repository";
import type { IFeaturesRepository } from "./features.repository.interface";

/**
 * Caching proxy for FeaturesRepository that adds Redis caching layer.
 * Falls back gracefully to the original repository when Redis is unavailable.
 */
export class CachedFeaturesRepository implements IFeaturesRepository {
  private redis: RedisService | null = null;
  private readonly REDIS_KEY_VERSION = "V1";
  private readonly CACHE_TTL = 300; // 5 minutes in seconds
  private featuresRepository: FeaturesRepository;

  constructor(featuresRepository?: FeaturesRepository) {
    this.featuresRepository = featuresRepository || new FeaturesRepository();

    const UPSTASH_ENV_FOUND = process.env.UPSTASH_REDIS_REST_TOKEN && process.env.UPSTASH_REDIS_REST_URL;
    if (UPSTASH_ENV_FOUND) {
      try {
        this.redis = new RedisService();
      } catch (error) {
        console.warn("Failed to initialize Redis service:", error);
        this.redis = null;
      }
    }
  }

  async checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags): Promise<boolean> {
    const cacheKey = `${this.REDIS_KEY_VERSION}.features:global:${slug}`;

    if (this.redis) {
      try {
        const cachedResult = await this.redis.get<boolean>(cacheKey);
        if (cachedResult !== null) {
          return cachedResult;
        }
      } catch (error) {
        console.warn("Redis get failed for global feature check, falling back to repository:", error);
      }
    }

    try {
      const result = await this.featuresRepository.checkIfFeatureIsEnabledGlobally(slug);

      if (this.redis) {
        try {
          await this.redis.set(cacheKey, result);
          await this.redis.expire(cacheKey, this.CACHE_TTL);
        } catch (error) {
          console.warn("Redis set failed for global feature check:", error);
        }
      }

      return result;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    const cacheKey = `${this.REDIS_KEY_VERSION}.features:user:${userId}:${slug}`;

    if (this.redis) {
      try {
        const cachedResult = await this.redis.get<boolean>(cacheKey);
        if (cachedResult !== null) {
          return cachedResult;
        }
      } catch (error) {
        console.warn("Redis get failed for user feature check, falling back to repository:", error);
      }
    }

    try {
      const result = await this.featuresRepository.checkIfUserHasFeature(userId, slug);

      if (this.redis) {
        try {
          await this.redis.set(cacheKey, result);
          await this.redis.expire(cacheKey, this.CACHE_TTL);
        } catch (error) {
          console.warn("Redis set failed for user feature check:", error);
        }
      }

      return result;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async checkIfTeamHasFeature(teamId: number, slug: keyof AppFlags): Promise<boolean> {
    const cacheKey = `${this.REDIS_KEY_VERSION}.features:team:${teamId}:${slug}`;

    if (this.redis) {
      try {
        const cachedResult = await this.redis.get<boolean>(cacheKey);
        if (cachedResult !== null) {
          return cachedResult;
        }
      } catch (error) {
        console.warn("Redis get failed for team feature check, falling back to repository:", error);
      }
    }

    try {
      const result = await this.featuresRepository.checkIfTeamHasFeature(teamId, slug);

      if (this.redis) {
        try {
          await this.redis.set(cacheKey, result);
          await this.redis.expire(cacheKey, this.CACHE_TTL);
        } catch (error) {
          console.warn("Redis set failed for team feature check:", error);
        }
      }

      return result;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async getAllFeatures() {
    return this.featuresRepository.getAllFeatures();
  }

  async getFeatureFlagMap() {
    return this.featuresRepository.getFeatureFlagMap();
  }

  async getTeamFeatures(teamId: number) {
    return this.featuresRepository.getTeamFeatures(teamId);
  }

  async invalidateCache(userId?: number, teamId?: number, slug?: string) {
    if (!this.redis) return;

    try {
      const keysToDelete: string[] = [];

      if (slug) {
        keysToDelete.push(`${this.REDIS_KEY_VERSION}.features:global:${slug}`);
        if (userId) {
          keysToDelete.push(`${this.REDIS_KEY_VERSION}.features:user:${userId}:${slug}`);
        }
        if (teamId) {
          keysToDelete.push(`${this.REDIS_KEY_VERSION}.features:team:${teamId}:${slug}`);
        }
      }

      for (const key of keysToDelete) {
        await this.redis.del(key);
      }
    } catch (error) {
      console.warn("Redis cache invalidation failed:", error);
    }
  }
}
