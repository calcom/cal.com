import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from "@nestjs/throttler";
import { Request } from "express";
import { PrismaService } from "../prisma.service";  // Assuming Prisma service is used
import { Cache } from 'cache-manager';  // Nest.js cache manager, inject as required
 
import { X_CAL_CLIENT_ID } from "@calcom/platform-constants";
import { isApiKey } from "@/lib/api-key";
 
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private logger = new Logger("CustomThrottlerGuard");
 
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,  // Prisma service to query DB
    private readonly cacheManager: Cache  // Cache manager for caching limits
  ) {
    super(options, storageService, reflector);
  }
 
  protected async handleRequest(context: any, limit: number, ttl: number): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const tracker = await this.getTracker(request);
 
    if (tracker.startsWith("api_key_")) {
      // Check if rate limit exists in cache
      const cachedRateLimit = await this.cacheManager.get<RateLimits>(tracker);
      let rateLimits: RateLimits;
 
      if (cachedRateLimit) {
        rateLimits = cachedRateLimit;
      } else {
        // Fetch rate limits from the database
        rateLimits = await this.prisma.rateLimits.findUnique({
          where: { apiKeyId: tracker.replace("api_key_", "") }
        });
 
        // Default values if no limits found in DB
        if (!rateLimits) {
          rateLimits = { ttl, limit, blockDuration: 60 }; // Default block duration in seconds
        }
 
        // Cache the result for 1 hour
        await this.cacheManager.set(tracker, rateLimits, { ttl: 3600 });
      }
 
      // Increment usage
      const usage = await this.storageService.increment(tracker, rateLimits.ttl);
 
      // Check if blocked
      if (usage > rateLimits.limit) {
        if (usage - rateLimits.limit >= rateLimits.blockDuration) {
          throw new Error("Rate limit exceeded. Try again later.");
        }
        throw new Error("Blocked due to exceeding rate limit.");
      }
 
      return true;
    } else {
      // Use default rate limiting for non-API key trackers
      const usage = await this.storageService.increment(tracker, ttl);
      
      if (usage > limit) {
        throw new Error("Rate limit exceeded. Try again later.");
      }
 
      return true;
    }
  }
 
  // Retaining the getTracker method from earlier
  protected async getTracker(request: Request): Promise<string> {
    const authorizationHeader = request.get("Authorization")?.replace("Bearer ", "");
 
    if (authorizationHeader) {
      return isApiKey(authorizationHeader, this.config.get<string>("api.apiKeyPrefix") ?? "cal_")
        ? `api_key_${authorizationHeader}`
        : `access_token_${authorizationHeader}`;
    }
 
    const oauthClientId = request.get(X_CAL_CLIENT_ID);
 
    if (oauthClientId) {
      return oauthClientId;
    }
 
    if (request.ip) {
      return request.ip;
    }
 
    this.logger.log(`no tracker found: ${request.url}`);
    return "unknown";
  }
}
 
