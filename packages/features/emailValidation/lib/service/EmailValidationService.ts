import { createHash } from "crypto";
import { z } from "zod";

import type { IRedisService } from "@calcom/features/redis/IRedisService";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { UserRepository } from "@calcom/lib/server/repository/user";

import { validationStatusSchema } from "../dto/types";
import type { EmailValidationRequest, EmailValidationResult, EmailValidationStatus } from "../dto/types";
import type { IEmailValidationProviderService } from "./IEmailValidationProviderService.interface";
import type { EmailValidationResponse, IEmailValidationService } from "./IEmailValidationService.interface";

/**
 * Hashes an email address using SHA-256 to protect PII in cache keys.
 * This ensures no plaintext email addresses are stored in Redis for privacy/HIPAA compliance.
 */
const hashEmail = (email: string): string => {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
};

const REDIS_EMAIL_VALIDATION_KEY = (email: string) => `email_validation:${hashEmail(email)}`;

// Consider increasing this to longer period if it make sense to do so
const EMAIL_VALIDATION_CACHE_TTL_MS = 24 * 3600 * 1000; // 1 day

// Cache the response for 5 mins if the provider is down to avoid hammering the provider
const EMAIL_VALIDATION_PROVIDER_DOWN_CACHE_TTL_MS = 300_000; // 5 minutes

const redisSchema = z.object({
  status: validationStatusSchema,
  subStatus: z.string().optional(),
});

/**
 * Main email validation service that handles cross-cutting concerns like caching, timing, logging,
 * and fallback behavior while delegating actual validation to provider services.
 *
 * Provides two validation paths:
 * 1. validateWithCalcom - checks if email is verified by Cal.com (cached)
 * 2. validateWithProvider - validates with external provider like ZeroBounce (cached, with timeout)
 *
 */
export class EmailValidationService implements IEmailValidationService {
  private readonly logger = logger.getSubLogger({ prefix: ["EmailValidationService"] });
  private readonly providerTimeout: number = 3000;

  /**
   * Canonical statuses that should block emails.
   * These are based on the universal meanings of the canonical statuses.
   */
  private readonly blockedStatuses: Set<EmailValidationStatus> = new Set<EmailValidationStatus>([
    "invalid",
    "spamtrap",
    "abuse",
    "do-not-mail",
  ]);

  constructor(
    private readonly deps: {
      emailValidationProvider: IEmailValidationProviderService;
      userRepository: UserRepository;
      redisService: IRedisService;
    }
  ) {}

  private async setInCache(
    email: string,
    result: EmailValidationResult
  ): Promise<{ success: boolean; error: string | null }> {
    const cacheKey = REDIS_EMAIL_VALIDATION_KEY(email);
    try {
      await this.deps.redisService.set(cacheKey, result, {
        ttl:
          result.status === "calcom-provider-fallback"
            ? EMAIL_VALIDATION_PROVIDER_DOWN_CACHE_TTL_MS
            : EMAIL_VALIDATION_CACHE_TTL_MS,
      });
      return {
        success: true,
        error: null,
      };
    } catch (cacheSetError) {
      const errorMessage = cacheSetError instanceof Error ? cacheSetError.message : "Unknown error";
      // Log cache set error but don't fail the request
      this.logger.error("Failed to cache email validation result", safeStringify(errorMessage));
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async getFromCache(
    email: string
  ): Promise<{ success: boolean; error: string | null; result: EmailValidationResult | null }> {
    try {
      const cacheKey = REDIS_EMAIL_VALIDATION_KEY(email);
      const cachedResult = await this.deps.redisService.get(cacheKey);
      const parsedResult = cachedResult ? redisSchema.safeParse(cachedResult) : null;
      return {
        success: true,
        result: parsedResult?.success ? parsedResult?.data : null,
        error: null,
      };
    } catch (cacheGetError) {
      const errorMessage = cacheGetError instanceof Error ? cacheGetError.message : "Unknown error";
      this.logger.error("Failed to get email validation result from cache", safeStringify(errorMessage));
      return {
        success: false,
        result: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Validates if an email is verified by Cal.com.
   * Checks cache first (single lookup), then Cal.com DB if cache miss.
   * Returns shouldBlock and continueWithProvider flags.
   */
  async validateWithCalcom(email: string) {
    const { success: cacheReadSuccess, result: cachedResult } = await this.getFromCache(email);

    // If found in cache, return result
    if (cachedResult) {
      const shouldBlock = this.isEmailBlocked(cachedResult.status);
      return {
        shouldBlock,
        continueWithProvider: false,
      };
    }

    // Cache miss or cache error - check Cal.com DB
    try {
      const user = await this.deps.userRepository.findByEmail({ email });
      const isVerified = !!(user && user.emailVerified);

      if (!isVerified) {
        // Not verified by Cal.com - caller should try provider
        return {
          shouldBlock: false,
          // Skip provider when cache is down to prevent:
          // 1. Hammering ZeroBounce with duplicate requests (no deduplication)
          // 2. Cost explosion (every request = API call)
          // 3. Rate limiting cascade (ZeroBounce blocks Cal.com)
          // Priority: Fix Redis immediately to restore validation.
          continueWithProvider: cacheReadSuccess,
        };
      }

      // Verified by Cal.com - try to cache result (but don't fail if cache is down)
      await this.setInCache(email, { status: "calcom-verified-email" });

      return {
        shouldBlock: false,
        continueWithProvider: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      // DB error - log and use fallback
      this.logger.warn(
        "validateWithCalcom DB error, allowing booking and continuing with provider",
        safeStringify(errorMessage)
      );

      return {
        shouldBlock: false,
        // If we are here due to an unhandled error, we could end up hammering the provider
        continueWithProvider: false,
      };
    }
  }

  /**
   * Validates email using external provider (ZeroBounce).
   * Assumes cache was already checked by validateWithCalcom.
   * Directly calls provider with timeout, then caches the result.
   */
  async validateWithProvider({
    request,
    skipCache,
  }: {
    request: EmailValidationRequest;
    skipCache: true;
  }): Promise<EmailValidationResponse> {
    // For now, we only support skipCache: true
    // Cache flow is not implemented as validateWithCalcom already handles cache
    if (!skipCache) {
      throw new Error(
        "validateWithProvider with skipCache=false is not supported. Use validateWithCalcom for cache checks."
      );
    }

    const { email } = request;

    try {
      // Validate with provider (no cache check - already done in validateWithCalcom)
      const result = await this.validateWithProviderInternal(request);

      // Cache the result
      await this.setInCache(email, result);

      const shouldBlock = this.isEmailBlocked(result.status);
      return {
        shouldBlock,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn("validateWithProvider error, allowing booking", safeStringify(errorMessage));
      return {
        shouldBlock: false,
      };
    }
  }

  /**
   * Internal method to validate with provider (with timeout).
   */
  private async validateWithProviderInternal(
    request: EmailValidationRequest
  ): Promise<EmailValidationResult> {
    const startTime = Date.now();

    try {
      // Create a timeout signal for the provider validation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.providerTimeout);

      try {
        // Race between provider validation and timeout
        const result = await Promise.race([
          this.deps.emailValidationProvider.validateEmail(request, controller.signal),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener("abort", () => {
              reject(new Error(`Email validation provider timeout after ${this.providerTimeout}ms`));
            });
          }),
        ]);

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        this.logger.info(
          "Time taken to validate email through provider",
          safeStringify({
            duration: `${duration}ms`,
            provider: this.deps.emailValidationProvider.constructor.name,
          })
        );

        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const duration = Date.now() - startTime;
      const fallbackResult: EmailValidationResult = {
        status: "calcom-provider-fallback",
      };

      this.logger.error(
        "Provider seems to be having issues, falling back to assuming the email is valid",
        safeStringify(errorMessage),
        safeStringify({
          duration: `${duration}ms`,
          provider: this.deps.emailValidationProvider.constructor.name,
        })
      );

      return fallbackResult;
    }
  }

  /**
   * Determines if an email should be blocked based on validation status.
   * Uses canonical status definitions to make universal blocking decisions.
   */
  private isEmailBlocked(status: EmailValidationStatus): boolean {
    return this.blockedStatuses.has(status);
  }
}
