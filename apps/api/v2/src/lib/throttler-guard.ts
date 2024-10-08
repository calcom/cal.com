import { getEnv } from "@/env";
import { hashAPIKey, isApiKey, stripApiKey } from "@/lib/api-key";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import { Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
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

const rateLimitSchema = z.object({
  name: z.string(),
  limit: z.number(),
  ttl: z.number(),
  blockDuration: z.number(),
});

type RateLimitType = z.infer<typeof rateLimitSchema>;

const rateLimitsSchema = z.array(rateLimitSchema);

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private logger = new Logger("CustomThrottlerGuard");

  private defaultTttl = Number(getEnv("RATE_LIMIT_DEFAULT_TTL_MS", 60 * 1000));
  private defaultLimit = Number(getEnv("RATE_LIMIT_DEFAULT_LIMIT", 120));
  private defaultBlockDuration = Number(getEnv("RATE_LIMIT_DEFAULT_BLOCK_DURATION_MS", 60 * 1000));

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
    this.logger.log(
      `Tracker "${tracker}" generated based on: Bearer token "${request.get(
        "Authorization"
      )}", OAuth client ID "${request.get(X_CAL_CLIENT_ID)}" and IP "${request.ip}"`
    );

    if (tracker.startsWith("api_key_")) {
      return this.handleApiKeyRequest(tracker, response);
    } else {
      return this.handleNonApiKeyRequest(tracker, response);
    }
  }

  private async handleApiKeyRequest(tracker: string, response: Response): Promise<boolean> {
    const rateLimits = await this.getRateLimitsForApiKeyTracker(tracker);

    let allLimitsBlocked = true;
    for (const rateLimit of rateLimits) {
      const { isBlocked } = await this.incrementRateLimit(tracker, rateLimit, response);
      if (!isBlocked) {
        allLimitsBlocked = false;
      }
    }

    if (allLimitsBlocked) {
      throw new ThrottlerException("Too many requests. Please try again later.");
    }

    return true;
  }

  private async handleNonApiKeyRequest(tracker: string, response: Response): Promise<boolean> {
    const rateLimit = this.getDefaultRateLimit();
    this.logger.log(`Tracker "${tracker}" uses default rate limits because it is not tracking api key:
      ${JSON.stringify(rateLimit, null, 2)}
    `);

    const { isBlocked } = await this.incrementRateLimit(tracker, rateLimit, response);
    if (isBlocked) {
      throw new ThrottlerException("Too many requests. Please try again later.");
    }

    return true;
  }

  private getDefaultRateLimit() {
    return {
      name: "default",
      limit: this.getDefaultLimit(),
      ttl: this.getDefaultTtl(),
      blockDuration: this.getDefaultBlockDuration(),
    };
  }

  getDefaultLimit() {
    return this.defaultLimit;
  }

  getDefaultTtl() {
    return this.defaultTttl;
  }

  getDefaultBlockDuration() {
    return this.defaultBlockDuration;
  }

  private async getRateLimitsForApiKeyTracker(tracker: string) {
    const cacheKey = `rate_limit:${tracker}`;

    const cachedRateLimits = await this.storageService.redis.get(cacheKey);
    if (cachedRateLimits) {
      this.logger.log(`Tracker "${tracker}" rate limits retrieved from redis cache:
        ${cachedRateLimits}
      `);
      return rateLimitsSchema.parse(JSON.parse(cachedRateLimits));
    }

    const apiKey = tracker.replace("api_key_", "");
    let rateLimits: RateLimitType[];
    const apiKeyRecord = await this.dbRead.prisma.apiKey.findUnique({
      where: { hashedKey: apiKey },
      select: { id: true },
    });

    if (!apiKeyRecord) {
      throw new UnauthorizedException("Invalid API Key");
    }

    rateLimits = await this.dbRead.prisma.rateLimit.findMany({
      where: { apiKeyId: apiKeyRecord.id },
      select: { name: true, limit: true, ttl: true, blockDuration: true },
    });

    if (rateLimits) {
      this.logger.log(`Tracker "${tracker}" rate limits retrieved from database:
        ${JSON.stringify(rateLimits, null, 2)}`);
    }

    if (!rateLimits || rateLimits.length === 0) {
      rateLimits = [this.getDefaultRateLimit()];
      this.logger.log(`Tracker "${tracker}" rate limits not found in database. Using default rate limits:
        ${JSON.stringify(rateLimits, null, 2)}`);
    }

    await this.storageService.redis.set(cacheKey, JSON.stringify(rateLimits), "EX", 3600);

    return rateLimits;
  }

  private async incrementRateLimit(tracker: string, rateLimit: RateLimitType, response: Response) {
    const { name, limit, ttl, blockDuration } = rateLimit;

    const key = `${tracker}:${limit}:${ttl}`;

    const { isBlocked, totalHits, timeToExpire, timeToBlockExpire } = await this.storageService.increment(
      key,
      ttl,
      limit,
      blockDuration,
      name
    );

    const nameFirstUpper = name.charAt(0).toUpperCase() + name.slice(1);
    response.setHeader(`X-RateLimit-Limit-${nameFirstUpper}`, limit);
    response.setHeader(
      `X-RateLimit-Remaining-${nameFirstUpper}`,
      timeToBlockExpire ? 0 : Math.max(0, limit - totalHits)
    );
    response.setHeader(`X-RateLimit-Reset-${nameFirstUpper}`, timeToBlockExpire || timeToExpire);

    this.logger.log(
      `Tracker "${tracker}" rate limit "${name}" incremented. isBlocked ${isBlocked}, totalHits ${totalHits}, timeToExpire ${timeToExpire}, timeToBlockExpire ${timeToBlockExpire}`
    );
    this.logger.log(
      `Tracker "${tracker}" rate limit "${name}" response headers:
        X-RateLimit-Limit-${nameFirstUpper}: ${limit},
        X-RateLimit-Remaining-${nameFirstUpper}: ${timeToBlockExpire ? 0 : Math.max(0, limit - totalHits)},
        X-RateLimit-Reset-${nameFirstUpper}: ${timeToBlockExpire || timeToExpire}`
    );

    return { isBlocked };
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
