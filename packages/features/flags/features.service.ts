import { captureException } from "@sentry/nextjs";

import type { IRedisService } from "../redis/IRedisService.d";
import type { AppFlags } from "./config";
import type { IFeaturesRepository } from "./features.repository.interface";
import type { IFeaturesService } from "./features.service.interface";

export class FeaturesService implements IFeaturesService {
  private static readonly CACHE_KEYS = {
    GLOBAL_FEATURE: (slug: string) => `feature:global:${slug}`,
    USER_FEATURE: (userId: number, slug: string) => `feature:user:${userId}:${slug}`,
    TEAM_FEATURE: (teamId: number, slug: string) => `feature:team:${teamId}:${slug}`,
  } as const;

  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(
    private readonly featuresRepository: IFeaturesRepository,
    private readonly redisService: IRedisService
  ) {}

  async checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags): Promise<boolean> {
    const cacheKey = FeaturesService.CACHE_KEYS.GLOBAL_FEATURE(slug);

    try {
      // Try to get from cache first
      const cachedResult = await this.redisService.get<boolean>(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
    } catch (err) {
      // Log cache error but don't fail the request
      captureException(err);
    }

    try {
      // Fallback to repository
      const result = await this.featuresRepository.checkIfFeatureIsEnabledGlobally(slug);

      // Cache the result
      try {
        await this.redisService.set(cacheKey, result, { ttl: FeaturesService.DEFAULT_TTL });
      } catch (cacheErr) {
        // Log cache error but don't fail the request
        captureException(cacheErr);
      }

      return result;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    const cacheKey = FeaturesService.CACHE_KEYS.USER_FEATURE(userId, slug);

    try {
      // Try to get from cache first
      const cachedResult = await this.redisService.get<boolean>(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
    } catch (err) {
      // Log cache error but don't fail the request
      captureException(err);
    }

    try {
      // Fallback to repository
      const result = await this.featuresRepository.checkIfUserHasFeature(userId, slug);

      // Cache the result
      try {
        await this.redisService.set(cacheKey, result, { ttl: FeaturesService.DEFAULT_TTL });
      } catch (cacheErr) {
        // Log cache error but don't fail the request
        captureException(cacheErr);
      }

      return result;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async checkIfTeamHasFeature(teamId: number, slug: keyof AppFlags): Promise<boolean> {
    const cacheKey = FeaturesService.CACHE_KEYS.TEAM_FEATURE(teamId, slug);

    try {
      // Try to get from cache first
      const cachedResult = await this.redisService.get<boolean>(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
    } catch (err) {
      // Log cache error but don't fail the request
      captureException(err);
    }

    try {
      // Fallback to repository
      const result = await this.featuresRepository.checkIfTeamHasFeature(teamId, slug);

      // Cache the result
      try {
        await this.redisService.set(cacheKey, result, { ttl: FeaturesService.DEFAULT_TTL });
      } catch (cacheErr) {
        // Log cache error but don't fail the request
        captureException(cacheErr);
      }

      return result;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
