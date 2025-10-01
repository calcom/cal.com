import { z } from "zod";

import type { IRedisService } from "@calcom/features/redis/IRedisService";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import type { EmailValidationRequest, EmailValidationResult, EmailValidationStatus } from "../dto/types";
import type {
  IEmailValidationCachingProxy,
  IEmailValidationService,
} from "./IEmailValidationService.interface";

export const REDIS_EMAIL_VALIDATION_CACHE_KEY = (email: string) => `email_validation:${email.toLowerCase()}`;

export const EMAIL_VALIDATION_CACHE_TTL_MS = 7_200_000; // 2 hours

function getPiiFreeEmail(email: string): string {
  return email.toLowerCase().slice(0, 10);
}

const redisSchema = z.object({
  status: z.string(),
  subStatus: z.string().optional(),
});

export class EmailValidationCachingProxy implements IEmailValidationCachingProxy {
  private readonly logger = logger.getSubLogger({ prefix: ["EmailValidationCachingProxy"] });
  /**
   * Statuses that are unblocked and are not supposed to be delegated to the service
   */
  private readonly unblockedStatuses: EmailValidationStatus[] = ["calcom-cache-fallback"];
  constructor(
    private readonly deps: {
      emailValidationService: IEmailValidationService;
      redisService: IRedisService;
    }
  ) {}

  /**
   * Returns an async generator that yields a null value if the email validation result is not cached.
   * If the email validation result is cached, it yields the cached result.
   * If the email validation result is not cached, it calls the email validation service and caches the result.
   *
   * @param request - The email validation request
   * @returns
   */
  async *validateEmailGenerator(
    request: EmailValidationRequest
  ): AsyncGenerator<null, EmailValidationResult, unknown> {
    const cacheKey = REDIS_EMAIL_VALIDATION_CACHE_KEY(request.email);
    try {
      const cachedResult = await this.deps.redisService.get(cacheKey);
      if (cachedResult) {
        const parsedCachedResult = redisSchema.parse(cachedResult);
        this.logger.info(
          "Email validation cache hit",
          safeStringify({
            email: getPiiFreeEmail(request.email),
            status: parsedCachedResult.status,
          })
        );
        return parsedCachedResult;
      }

      this.logger.info(
        "Email validation cache miss, calling service",
        safeStringify({
          email: getPiiFreeEmail(request.email),
        })
      );

      // We yield so that we communicate that we don't have cached result and we further need to call next() to get the result from the actual service
      yield null;

      const result = await this.deps.emailValidationService.validateEmail(request);

      // We cache the result and not just isBlocked boolean because querying for email is costly and we might want to reuse the cache for other things as well
      await this.deps.redisService.set(cacheKey, result, {
        ttl: EMAIL_VALIDATION_CACHE_TTL_MS,
      });

      this.logger.info(
        "Email validation result cached",
        safeStringify({
          email: getPiiFreeEmail(request.email),
          status: result.status,
          ttl: EMAIL_VALIDATION_CACHE_TTL_MS,
        })
      );

      return result;
    } catch (cacheError) {
      this.logger.warn(
        "Email validation cache error, falling back to assuming the email is valid",
        safeStringify({
          email: getPiiFreeEmail(request.email),
        }),
        safeStringify(cacheError instanceof Error ? cacheError.message : "Unknown cache error")
      );

      // If caching fails consider the email as valid instead of sending load to the service provider causing rate limiting and what not
      return {
        // A special status to indicate that we fell back to assuming the email is valid because cache retrieval failed
        status: "calcom-cache-fallback",
      };
    }
  }

  public isEmailBlocked(status: EmailValidationStatus): boolean {
    if (this.unblockedStatuses.includes(status)) {
      return false;
    }
    return this.deps.emailValidationService.isEmailBlocked(status);
  }
}
