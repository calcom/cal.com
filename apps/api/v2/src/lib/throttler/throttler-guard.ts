import { getEnv } from "@/env";
import { hashAPIKey, isApiKey, stripApiKey } from "@/lib/api-key";
import { CUSTOM_THROTTLER_KEY, CustomThrottler } from "@/lib/throttler/custom-throttler.decorator";
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

  private defaultTtl = Number(getEnv("RATE_LIMIT_DEFAULT_TTL_MS", sixtySecondsMs));

  private defaultLimitApiKey = Number(getEnv("RATE_LIMIT_DEFAULT_LIMIT_API_KEY", 120));
  private defaultLimitOAuthClient = Number(getEnv("RATE_LIMIT_DEFAULT_LIMIT_OAUTH_CLIENT", 500));
  private defaultLimitAccessToken = Number(getEnv("RATE_LIMIT_DEFAULT_LIMIT_ACCESS_TOKEN", 500));
  private defaultLimit = Number(getEnv("RATE_LIMIT_DEFAULT_LIMIT", 120));

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
    const customThrottler = this.reflector.getAllAndOverride<CustomThrottler>(CUSTOM_THROTTLER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const tracker = await this.getTracker(request, customThrottler);
    return this.hasRequestsRemaining(tracker, response, customThrottler);
  }

  protected async getTracker(request: Request, customThrottler?: CustomThrottler): Promise<string> {
    const authorizationHeader = request.get("Authorization")?.replace("Bearer ", "");
    const oauthClientId = request.get(X_CAL_CLIENT_ID);

    let baseTracker: string;

    if (authorizationHeader) {
      const apiKeyPrefix = getEnv("API_KEY_PREFIX", "cal_");
      baseTracker = isApiKey(authorizationHeader, apiKeyPrefix)
        ? `${API_KEY_}${hashAPIKey(stripApiKey(authorizationHeader, apiKeyPrefix))}`
        : `${ACCESS_TOKEN_}${authorizationHeader}`;
    } else if (oauthClientId) {
      baseTracker = `${OAUTH_CLIENT_}${oauthClientId}`;
    } else if (request.ip) {
      baseTracker = `${IP_}${request.ip}`;
    } else {
      baseTracker = "unknown";
    }

    return customThrottler ? `${baseTracker}:${customThrottler.name}` : baseTracker;
  }

  private async hasRequestsRemaining(
    tracker: string,
    response: Response,
    customThrottler?: CustomThrottler
  ): Promise<boolean> {
    const rateLimits = await this.getRateLimits(tracker, customThrottler);

    let allLimitsBlocked = true;
    for (const rateLimit of rateLimits) {
      const { isBlocked } = await this.incrementRateLimit(tracker, rateLimit, response, customThrottler);
      if (!isBlocked) {
        allLimitsBlocked = false;
      }
    }

    if (allLimitsBlocked) {
      throw new ThrottlerException("Too many requests. Please try again later.");
    }

    return true;
  }

  private async getRateLimits(tracker: string, customThrottler?: CustomThrottler) {
    if (tracker.startsWith(API_KEY_)) {
      return await this.getRateLimitsForApiKeyTracker(tracker, customThrottler);
    } else if (tracker.startsWith(ACCESS_TOKEN_)) {
      return await this.getRateLimitsForAccessTokenTracker(tracker, customThrottler);
    } else if (tracker.startsWith(OAUTH_CLIENT_)) {
      return await this.getRateLimitsForOAuthClientTracker(tracker, customThrottler);
    } else {
      return [this.getDefaultRateLimit(customThrottler)];
    }
  }

  private async getRateLimitsForApiKeyTracker(tracker: string, customThrottler?: CustomThrottler) {
    const cacheKey = `rate_limit:${tracker}`;

    const cachedRateLimits = await this.storageService.redis.get(cacheKey);
    if (cachedRateLimits) {
      return rateLimitsSchema.parse(JSON.parse(cachedRateLimits));
    }

    // note(Lauris): in case of custom tracker name tracker is in the format "api_key_<hashed_key>:<name>"
    const apiKey = tracker.split(":")[0].replace(API_KEY_, "");
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
        rateLimits = [this.getDefaultRateLimitByTracker(tracker, customThrottler)];
      }
    } else {
      this.logger.verbose(`warning - ApiKey "${apiKey}" not found, default rate limit applied.`);
      rateLimits = [this.getDefaultRateLimit(customThrottler)];
    }

    await this.storageService.redis.set(cacheKey, JSON.stringify(rateLimits), "EX", 3600);

    return rateLimits;
  }

  private async getRateLimitsForOAuthClientTracker(tracker: string, customThrottler?: CustomThrottler) {
    const cacheKey = `rate_limit:${tracker}`;

    const cachedRateLimits = await this.storageService.redis.get(cacheKey);
    if (cachedRateLimits) {
      return rateLimitsSchema.parse(JSON.parse(cachedRateLimits));
    }

    // note(Lauris): in case of custom tracker name tracker is in the format "oauth_client_<hashed_key>:<name>"
    const clientId = tracker.split(":")[0].replace(OAUTH_CLIENT_, "");

    const oAuthClient = await this.dbRead.prisma.platformOAuthClient.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    let rateLimits: RateLimitType[];

    if (oAuthClient) {
      rateLimits = [this.getDefaultRateLimitByTracker(tracker, customThrottler)];
    } else {
      this.logger.verbose(`warning - OAuth Client "${clientId}" not found, default rate limit applied.`);
      rateLimits = [this.getDefaultRateLimit(customThrottler)];
    }

    await this.storageService.redis.set(cacheKey, JSON.stringify(rateLimits), "EX", 3600);

    return rateLimits;
  }

  private async getRateLimitsForAccessTokenTracker(tracker: string, customThrottler?: CustomThrottler) {
    const cacheKey = `rate_limit:${tracker}`;

    const cachedRateLimits = await this.storageService.redis.get(cacheKey);
    if (cachedRateLimits) {
      return rateLimitsSchema.parse(JSON.parse(cachedRateLimits));
    }

    // note(Lauris): in case of custom tracker name tracker is in the format "access_token_<hashed_key>:<name>"
    const accessToken = tracker.split(":")[0].replace(ACCESS_TOKEN_, "");

    let rateLimits: RateLimitType[];

    const isValid = await this.oauthFlowService.validateAccessToken(accessToken);
    if (isValid) {
      rateLimits = [this.getDefaultRateLimitByTracker(tracker, customThrottler)];
    } else {
      this.logger.verbose(`warning - AccessToken "${accessToken}" is invalid, default rate limit applied.`);
      rateLimits = [this.getDefaultRateLimit(customThrottler)];
    }

    await this.storageService.redis.set(cacheKey, JSON.stringify(rateLimits), "EX", 3600);

    return rateLimits;
  }

  private getDefaultRateLimitByTracker(tracker: string, customThrottler?: CustomThrottler) {
    return {
      name: customThrottler?.name || "default",
      limit: this.getDefaultLimitByTracker(tracker),
      ttl: this.getDefaultTtl(),
      blockDuration: this.getDefaultBlockDuration(),
    };
  }

  private getDefaultRateLimit(customThrottler?: CustomThrottler) {
    return {
      name: customThrottler?.name || "default",
      limit: this.getDefaultLimit(customThrottler),
      ttl: this.getDefaultTtl(),
      blockDuration: this.getDefaultBlockDuration(),
    };
  }

  getDefaultLimit(customThrottler?: CustomThrottler) {
    return customThrottler?.defaultLimit ?? this.defaultLimit;
  }

  getDefaultLimitByTracker(tracker: string, customThrottler?: CustomThrottler) {
    if (tracker.startsWith(API_KEY_)) {
      return this.defaultLimitApiKey;
    } else if (tracker.startsWith(OAUTH_CLIENT_)) {
      return this.defaultLimitOAuthClient;
    } else if (tracker.startsWith(ACCESS_TOKEN_)) {
      return this.defaultLimitAccessToken;
    } else {
      return this.getDefaultLimit(customThrottler);
    }
  }

  getDefaultTtl() {
    return this.defaultTtl;
  }

  getDefaultBlockDuration() {
    return this.defaultBlockDuration;
  }

  private async incrementRateLimit(
    tracker: string,
    rateLimit: RateLimitType,
    response: Response,
    customThrottler?: CustomThrottler
  ) {
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
