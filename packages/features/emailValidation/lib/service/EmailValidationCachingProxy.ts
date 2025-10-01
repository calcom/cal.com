import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import type { EmailValidationRequest, EmailValidationResult, EmailValidationStatus } from "../dto/types";
import type { IEmailValidationService } from "./IEmailValidationService.interface";

interface IRedisService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: { ttl?: number }): Promise<void>;
}

export const REDIS_EMAIL_VALIDATION_CACHE_KEY = (email: string) => `email_validation:${email.toLowerCase()}`;

export const EMAIL_VALIDATION_CACHE_TTL_MS = 7_200_000; // 2 hours

export class EmailValidationCachingProxy implements IEmailValidationService {
  private readonly logger = logger.getSubLogger({ prefix: ["EmailValidationCachingProxy"] });

  constructor(
    private readonly deps: {
      emailValidationService: IEmailValidationService;
      redisService: IRedisService;
    }
  ) {}

  async validateEmail(request: EmailValidationRequest): Promise<EmailValidationResult> {
    const cacheKey = REDIS_EMAIL_VALIDATION_CACHE_KEY(request.email);

    try {
      const cachedResult = await this.deps.redisService.get<EmailValidationResult>(cacheKey);
      if (cachedResult) {
        this.logger.info(
          "Email validation cache hit",
          safeStringify({
            email: request.email,
            status: cachedResult.status,
          })
        );
        return cachedResult;
      }

      this.logger.info(
        "Email validation cache miss, calling service",
        safeStringify({
          email: request.email,
        })
      );

      const result = await this.deps.emailValidationService.validateEmail(request);

      await this.deps.redisService.set(cacheKey, result, {
        ttl: EMAIL_VALIDATION_CACHE_TTL_MS,
      });

      this.logger.info(
        "Email validation result cached",
        safeStringify({
          email: request.email,
          status: result.status,
          ttl: EMAIL_VALIDATION_CACHE_TTL_MS,
        })
      );

      return result;
    } catch (cacheError) {
      this.logger.warn(
        "Email validation cache error, falling back to service",
        safeStringify({
          email: request.email,
        }),
        safeStringify(cacheError instanceof Error ? cacheError.message : "Unknown cache error")
      );

      // If caching fails, fall back to calling the service directly
      return this.deps.emailValidationService.validateEmail(request);
    }
  }

  public isEmailBlocked(status: EmailValidationStatus): boolean {
    return this.deps.emailValidationService.isEmailBlocked(status);
  }
}
