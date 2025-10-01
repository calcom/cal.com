import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { UserRepository } from "@calcom/lib/server/repository/user";

import type { EmailValidationRequest, EmailValidationResult, EmailValidationStatus } from "../dto/types";
import type { IEmailValidationProviderService } from "./IEmailValidationProviderService.interface";
import type { IEmailValidationService } from "./IEmailValidationService.interface";

/**
 * Main email validation service that handles cross-cutting concerns like timing, logging,
 * and fallback behavior while delegating actual validation to provider services.
 *
 * Delegates validation and blocking decisions to the underlying provider service.
 */

function getPiiFreeEmail(email: string): string {
  return email.toLowerCase().slice(0, 10);
}

export class EmailValidationService implements IEmailValidationService {
  private readonly logger = logger.getSubLogger({ prefix: ["EmailValidationService"] });
  private readonly providerTimeout: number = 3000;
  /**
   * Statuses that are unblocked and don't need to be delegated to the provider
   */
  private readonly unblockedStatuses = ["calcom-verified-email"];
  constructor(
    private readonly deps: {
      emailValidationProvider: IEmailValidationProviderService;
      userRepository: UserRepository;
    }
  ) {}

  async validateEmail(request: EmailValidationRequest): Promise<EmailValidationResult> {
    const startTime = Date.now();
    const { email } = request;

    const isVerified = await this.isEmailVerifiedInCalcom(email);
    if (isVerified) {
      return {
        status: "calcom-verified-email",
      };
    }

    try {
      // Create a timeout signal for the provider validation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.providerTimeout);

      try {
        // Race between provider validation and timeout
        const result = await Promise.race([
          this.deps.emailValidationProvider.validateEmail(request),
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
      const duration = Date.now() - startTime;
      const fallbackResult = {
        status: "calcom-provider-fallback",
      };

      this.logger.error(
        "Email validation through provider crashed, falling back to assuming the email is valid",
        safeStringify({
          email: getPiiFreeEmail(email),
          error: error instanceof Error ? error.message : "Unknown error",
          duration: `${duration}ms`,
          provider: this.deps.emailValidationProvider.constructor.name,
        })
      );

      return fallbackResult;
    }
  }

  /**
   * Checks if an email is already verified by Cal.com itself
   */
  private async isEmailVerifiedInCalcom(email: string): Promise<boolean> {
    const user = await this.deps.userRepository.findByEmail({ email });
    return !!(user && user.emailVerified);
  }

  /**
   * Determines if an email should be blocked based on validation status.
   * Handles calcom-verified-email status here, delegates provider statuses to provider.
   */
  public isEmailBlocked(status: EmailValidationStatus): boolean {
    if (this.unblockedStatuses.includes(status)) {
      return false;
    }
    return this.deps.emailValidationProvider.isEmailBlocked(status);
  }
}
