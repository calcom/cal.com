import { getEnv } from "@/env";
import { hashAPIKey, isApiKey, stripApiKey } from "@/lib/api-key";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
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

const sixtySecondsMs = 60 * 1000;
const API_KEY_ = "api_key_";
const ACCESS_TOKEN_ = "access_token_";
const OAUTH_CLIENT_ = "oauth_client_";
const IP_ = "ip_";

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private logger = new Logger("CustomThrottlerGuard");

  private defaultTttl = Number(getEnv("RATE_LIMIT_DEFAULT_TTL_MS", sixtySecondsMs));

  private defaultLimitApiKey = Number(getEnv("RATE_LIMIT_DEFAULT_LIMIT_API_KEY", 120));
  private defaultLimitOAuthClient = Number(getEnv("RATE_LIMIT_DEFAULT_LIMIT_OAUTH_CLIENT", 500));
  private defaultLimitAccessToken = Number(getEnv("RATE_LIMIT_DEFAULT_LIMIT_ACCESS_TOKEN", 500));
  private defaultLimit = Number(getEnv("RATE_LIMIT_DEFAULT_LIMIT", 10));

  private defaultBlockDuration = Number(getEnv("RATE_LIMIT_DEFAULT_BLOCK_DURATION_MS", sixtySecondsMs));

  constructor(
    options: ThrottlerModuleOptions,
    @Inject(ThrottlerStorageRedisService) protected readonly storageService: ThrottlerStorageRedisService,
    reflector: Reflector,
    private readonly dbRead: PrismaReadService,
    private readonly oauthFlowService: OAuthFlowService
  ) {
    super(options, storageService, reflector);
    this.storageService = storageService;
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context } = requestProps;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const tracker = await this.getTracker(request);

    return this.hasRequestsRemaining(tracker, response);
  }

  protected async getTracker(request: Request): Promise<string> {
    const authorizationHeader = request.get("Authorization")?.replace("Bearer ", "");

    if (authorizationHeader) {
      const apiKeyPrefix = getEnv("API_KEY_PREFIX", "cal_");
      return isApiKey(authorizationHeader, apiKeyPrefix)
        ? `${API_KEY_}${hashAPIKey(stripApiKey(authorizationHeader, apiKeyPrefix))}`
        : `${ACCESS_TOKEN_}${authorizationHeader}`;
    }

    const oauthClientId = request.get(X_CAL_CLIENT_ID);

    if (oauthClientId) {
      return `${OAUTH_CLIENT_}${oauthClientId}`;
    }

    if (request.ip) {
      return `${IP_}${request.ip}`;
    }

    return "unknown";
  }

  private async hasRequestsRemaining(tracker: string, response: Response): Promise<boolean> {
    const rateLimits = await this.getRateLimits(tracker);

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

  private async getRateLimits(tracker: string) {
    if (tracker.startsWith(API_KEY_)) {
      return await this.getRateLimitsForApiKeyTracker(tracker);
    } else if (tracker.startsWith(ACCESS_TOKEN_)) {
      return await this.getRateLimitsForAccessTokenTracker(tracker);
    } else if (tracker.startsWith(OAUTH_CLIENT_)) {
      return await this.getRateLimitsForOAuthClientTracker(tracker);
    } else {
      return [this.getDefaultRateLimitByTracker(tracker)];
    }
  }

  private async getRateLimitsForApiKeyTracker(tracker: string) {
    const cacheKey = `rate_limit:${tracker}`;

    const cachedRateLimits = await this.storageService.redis.get(cacheKey);
    if (cachedRateLimits) {
      return rateLimitsSchema.parse(JSON.parse(cachedRateLimits));
    }

    const apiKey = tracker.replace(API_KEY_, "");
    const apiKeyRecord = await this.dbRead.prisma.apiKey.findUnique({
      where: { hashedKey: apiKey },
      select: { id: true },
    });

    let rateLimits: RateLimitType[];

    if (apiKeyRecord) {
      rateLimits = await this.dbRead.prisma.rateLimit.findMany({
        where: { apiKeyId: apiKeyRecord.id },
        select: { name: true, limit: true, ttl: true, blockDuration: true },
      });
      if (!rateLimits || rateLimits.length === 0) {
        rateLimits = [this.getDefaultRateLimitByTracker(tracker)];
      }
    } else {
      this.logger.verbose(`warning - ApiKey "${apiKey}" not found, default rate limit applied.`);
      rateLimits = [this.getDefaultRateLimit()];
    }

    await this.storageService.redis.set(cacheKey, JSON.stringify(rateLimits), "EX", 3600);

    return rateLimits;
  }

  private async getRateLimitsForOAuthClientTracker(tracker: string) {
    const cacheKey = `rate_limit:${tracker}`;

    const cachedRateLimits = await this.storageService.redis.get(cacheKey);
    if (cachedRateLimits) {
      return rateLimitsSchema.parse(JSON.parse(cachedRateLimits));
    }

    const clientId = tracker.replace(OAUTH_CLIENT_, "");

    const oAuthClient = await this.dbRead.prisma.platformOAuthClient.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    let rateLimits: RateLimitType[];

    if (oAuthClient) {
      rateLimits = [this.getDefaultRateLimitByTracker(tracker)];
    } else {
      this.logger.verbose(`warning - OAuth Client "${clientId}" not found, default rate limit applied.`);
      rateLimits = [this.getDefaultRateLimit()];
    }

    await this.storageService.redis.set(cacheKey, JSON.stringify(rateLimits), "EX", 3600);

    return rateLimits;
  }

  private async getRateLimitsForAccessTokenTracker(tracker: string) {
    const cacheKey = `rate_limit:${tracker}`;

    const cachedRateLimits = await this.storageService.redis.get(cacheKey);
    if (cachedRateLimits) {
      return rateLimitsSchema.parse(JSON.parse(cachedRateLimits));
    }

    const accessToken = tracker.replace(ACCESS_TOKEN_, "");

    let rateLimits: RateLimitType[];

    try {
      await this.oauthFlowService.validateAccessToken(accessToken);
      rateLimits = [this.getDefaultRateLimitByTracker(tracker)];
    } catch (err) {
      this.logger.verbose(`warning - AccessToken "${accessToken}" is invalid, default rate limit applied.`);
      rateLimits = [this.getDefaultRateLimit()];
    }

    await this.storageService.redis.set(cacheKey, JSON.stringify(rateLimits), "EX", 3600);

    return rateLimits;
  }

  private getDefaultRateLimitByTracker(tracker: string) {
    return {
      name: "default",
      limit: this.getDefaultLimitByTracker(tracker),
      ttl: this.getDefaultTtl(),
      blockDuration: this.getDefaultBlockDuration(),
    };
  }

  private getDefaultRateLimit() {
    return {
      name: "default",
      limit: this.defaultLimit,
      ttl: this.getDefaultTtl(),
      blockDuration: this.getDefaultBlockDuration(),
    };
  }

  private getDefaultLimitByTracker(tracker: string) {
    if (tracker.startsWith(API_KEY_)) {
      return this.defaultLimitApiKey;
    } else if (tracker.startsWith(OAUTH_CLIENT_)) {
      return this.defaultLimitOAuthClient;
    } else if (tracker.startsWith(ACCESS_TOKEN_)) {
      return this.defaultLimitAccessToken;
    } else {
      return this.defaultLimit;
    }
  }

  private getDefaultTtl() {
    return this.defaultTttl;
  }

  private getDefaultBlockDuration() {
    return this.defaultBlockDuration;
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

    this.logger.verbose(
      `Tracker "${tracker}" rate limit "${name}" incremented. isBlocked ${isBlocked}, totalHits ${totalHits}, timeToExpire ${timeToExpire}, timeToBlockExpire ${timeToBlockExpire}`
    );
    this.logger.verbose(
      `Tracker "${tracker}" rate limit "${name}" response headers:
        X-RateLimit-Limit-${nameFirstUpper}: ${limit},
        X-RateLimit-Remaining-${nameFirstUpper}: ${timeToBlockExpire ? 0 : Math.max(0, limit - totalHits)},
        X-RateLimit-Reset-${nameFirstUpper}: ${timeToBlockExpire || timeToExpire}\n`
    );

    return { isBlocked };
  }
}
