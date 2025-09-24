import type { PrismaClient } from "@calcom/prisma";

import type { IRedisService } from "../redis/IRedisService.d";
import { FeaturesRepository } from "./features.repository";
import { FeaturesService } from "./features.service";
import { FeaturesServiceCachingProxy } from "./features.service.caching-proxy";
import type { IFeaturesService } from "./features.service.interface";

export interface CacheConfig {
  defaultTtl?: number;
  errorTtl?: number;
  enableErrorCaching?: boolean;
  keyPrefix?: string;
}

export interface ServiceConfig {
  cache?: CacheConfig;
  enableProxy?: boolean;
}

export class FeaturesServiceFactory {
  static create(
    prismaClient: PrismaClient,
    redisService: IRedisService,
    config: ServiceConfig = {}
  ): IFeaturesService {
    const featuresRepository = new FeaturesRepository(prismaClient);
    const featuresService = new FeaturesService(featuresRepository);

    // If proxy is disabled, return the basic service without caching
    if (config.enableProxy === false) {
      return featuresService;
    }

    // Return the service wrapped with caching proxy
    return new FeaturesServiceCachingProxy(featuresService, redisService, config.cache || {});
  }
}
