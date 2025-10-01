import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import type { EmailValidationRequest, EmailValidationResult, EmailValidationStatus } from "../dto/types";
import type { IEmailValidationProviderService } from "./IEmailValidationProviderService.interface";
import type { IEmailValidationService } from "./IEmailValidationService.interface";

/**
 * Main email validation service that handles cross-cutting concerns like timing, logging,
 * and fallback behavior while delegating actual validation to provider services.
 *
 * Delegates validation and blocking decisions to the underlying provider service.
 */
export class EmailValidationService implements IEmailValidationService {
  private readonly logger = logger.getSubLogger({ prefix: ["EmailValidationService"] });

  constructor(
    private readonly deps: {
      emailValidationProvider: IEmailValidationProviderService;
    }
  ) {}

  async validateEmail(request: EmailValidationRequest): Promise<EmailValidationResult> {
    const startTime = Date.now();
    const { email } = request;

    try {
      const result = await this.deps.emailValidationProvider.validateEmail(request);
      const duration = Date.now() - startTime;

      this.logger.info(
        "Email validation completed successfully",
        safeStringify({
          email,
          status: result.status,
          blocked: this.deps.emailValidationProvider.isEmailBlocked(result.status),
          duration: `${duration}ms`,
          provider: this.deps.emailValidationProvider.constructor.name,
        })
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const fallbackResult = this.createFallbackResult(email);

      this.logger.error(
        "Email validation through provider crashed, falling back to assuming the email is valid",
        safeStringify({
          email,
          error: error instanceof Error ? error.message : "Unknown error",
          fallbackStatus: fallbackResult.status,
          duration: `${duration}ms`,
          provider: this.deps.emailValidationProvider.constructor.name,
        })
      );

      return fallbackResult;
    }
  }

  /**
   * Creates a fallback result when validation crashes.
   * Defaults to "valid" to avoid blocking legitimate users.
   */
  private createFallbackResult(email: string): EmailValidationResult {
    return {
      email,
      status: "valid",
    };
  }

  /**
   * Delegates blocking decision to the underlying service provider.
   */
  public isEmailBlocked(status: EmailValidationStatus): boolean {
    return this.deps.emailValidationProvider.isEmailBlocked(status);
  }
}
