import type { EmailValidationRequest, EmailValidationResult, EmailValidationStatus } from "../dto/types";

/**
 * Interface for email validation provider services (third-party implementations).
 *
 * Providers are responsible for:
 * - Actual validation logic using third-party APIs
 * - Determining which statuses should block emails
 * - Provider-specific error handling and timeouts
 */
export interface IEmailValidationProviderService {
  validateEmail(request: EmailValidationRequest): Promise<EmailValidationResult>;
  isEmailBlocked(status: EmailValidationStatus): boolean;
}
