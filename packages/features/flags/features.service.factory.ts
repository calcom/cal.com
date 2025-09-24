import { prisma } from "@calcom/prisma";

import { NoopRedisService } from "../redis/NoopRedisService";
import { RedisService } from "../redis/RedisService";
import { FeaturesRepository } from "./features.repository";
import { FeaturesService } from "./features.service";

let _featuresServiceInstance: FeaturesService | null = null;

/**
 * Factory function to create a singleton FeaturesService instance.
 * This provides a simple way to get the service without requiring full DI setup.
 *
 * Uses Redis if available, otherwise falls back to NoopRedisService.
 */
export function createFeaturesService(): FeaturesService {
  if (_featuresServiceInstance) {
    return _featuresServiceInstance;
  }

  const featuresRepository = new FeaturesRepository(prisma);

  const redisService =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? new RedisService()
      : new NoopRedisService();

  _featuresServiceInstance = new FeaturesService(featuresRepository, redisService);

  return _featuresServiceInstance;
}
