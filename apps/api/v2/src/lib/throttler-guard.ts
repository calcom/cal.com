import { getEnv } from "@/env";
import { hashAPIKey, isApiKey, stripApiKey } from "@/lib/api-key";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import { Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import {
  ThrottlerGuard,
  ThrottlerException,
  ThrottlerRequest,
  ThrottlerModuleOptions,
  seconds,
} from "@nestjs/throttler";
import { Request, Response } from "express";
import { z } from "zod";

import { X_CAL_CLIENT_ID } from "@calcom/platform-constants";

const DEFAULT_TTL = Number(getEnv("RATE_LIMIT_DEFAULT_TTL_MS", 60 * 1000));
const DEFAULT_LIMIT = Number(getEnv("RATE_LIMIT_DEFAULT_LIMIT", 120));
const DEFAULT_BLOCK_DURATION = Number(getEnv("RATE_LIMIT_DEFAULT_BLOCK_DURATION_MS", 60 * 1000));

const rateLimitSchema = z.object({
  limit: z.number(),
  ttl: z.number(),
  blockDuration: z.number(),
});

const rateLimitsSchema = z.array(rateLimitSchema);

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private logger = new Logger("CustomThrottlerGuard");

  constructor(
    options: ThrottlerModuleOptions,
    @Inject(ThrottlerStorageRedisService) protected readonly storageService: ThrottlerStorageRedisService,
    reflector: Reflector,
    private readonly dbRead: PrismaReadService
  ) {
    super(options, storageService, reflector);
    this.storageService = storageService;
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context } = requestProps;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const tracker = await this.getTracker(request);

    if (tracker.startsWith("api_key_")) {
      return this.handleApiKeyRequest(tracker, response);
    } else {
      return this.handleNonApiKeyRequest(tracker, response);
    }
  }

  private async handleApiKeyRequest(tracker: string, response: Response): Promise<boolean> {
    const rateLimits = await this.getRateLimitsForApiKeyTracker(tracker);

    for (const rateLimit of rateLimits) {
      await this.incrementRateLimit(tracker, rateLimit, response);
    }

    return true;
  }

  private async handleNonApiKeyRequest(tracker: string, response: Response): Promise<boolean> {
    const rateLimit = {
      limit: DEFAULT_LIMIT,
      ttl: DEFAULT_TTL,
      blockDuration: DEFAULT_BLOCK_DURATION,
    };

    await this.incrementRateLimit(tracker, rateLimit, response);

    return true;
  }

  private async getRateLimitsForApiKeyTracker(
    tracker: string
  ): Promise<Array<{ limit: number; ttl: number; blockDuration: number }>> {
    const cacheKey = `rate_limit:${tracker}`;

    const cachedRateLimits = await this.storageService.redis.get(cacheKey);
    if (cachedRateLimits) {
      return rateLimitsSchema.parse(JSON.parse(cachedRateLimits));
    }

    const apiKey = tracker.replace("api_key_", "");
    let rateLimits: Array<{ limit: number; ttl: number; blockDuration: number }>;
    const apiKeyRecord = await this.dbRead.prisma.apiKey.findUnique({
      where: { hashedKey: apiKey },
      select: { id: true },
    });

    if (!apiKeyRecord) {
      throw new UnauthorizedException("Invalid API Key");
    }

    rateLimits = await this.dbRead.prisma.rateLimit.findMany({
      where: { apiKeyId: apiKeyRecord.id },
      select: { limit: true, ttl: true, blockDuration: true },
    });

    if (!rateLimits || rateLimits.length === 0) {
      rateLimits = [
        {
          limit: DEFAULT_LIMIT,
          ttl: DEFAULT_TTL,
          blockDuration: DEFAULT_BLOCK_DURATION,
        },
      ];
    }

    await this.storageService.redis.setex(cacheKey, 3600, JSON.stringify(rateLimits));

    return rateLimits;
  }

  private async incrementRateLimit(
    tracker: string,
    rateLimit: { limit: number; ttl: number; blockDuration: number },
    response: Response
  ) {
    const { limit, ttl, blockDuration } = rateLimit;

    const key = `${tracker}:${limit}:${ttl}`;

    const { isBlocked, totalHits, timeToExpire, timeToBlockExpire } = await this.storageService.increment(
      key,
      ttl,
      limit,
      blockDuration,
      "default"
    );

    response.setHeader("X-RateLimit-Limit", limit);
    response.setHeader("X-RateLimit-Remaining", timeToBlockExpire ? 0 : Math.max(0, limit - totalHits));
    response.setHeader("X-RateLimit-Reset", timeToBlockExpire || timeToExpire);

    if (isBlocked) {
      throw new ThrottlerException("Too many requests. Please try again later.");
    }

    this.logger.log(`Rate limit for ${tracker} incremented. Remaining: ${limit - totalHits}`);
  }

  protected async getTracker(request: Request): Promise<string> {
    const authorizationHeader = request.get("Authorization")?.replace("Bearer ", "");

    if (authorizationHeader) {
      const apiKeyPrefix = getEnv("API_KEY_PREFIX", "cal_");
      return isApiKey(authorizationHeader, apiKeyPrefix)
        ? `api_key_${hashAPIKey(stripApiKey(authorizationHeader, apiKeyPrefix))}`
        : `access_token_${authorizationHeader}`;
    }

    const oauthClientId = request.get(X_CAL_CLIENT_ID);

    if (oauthClientId) {
      return `oauth_client_${oauthClientId}`;
    }

    if (request.ip) {
      return `ip_${request.ip}`;
    }

    this.logger.log(`no tracker found: ${request.url}`);
    return "unknown";
  }
}
