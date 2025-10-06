import type { EmailValidationRequest, EmailValidationResult } from "../dto/types";

/**
 * Interface for email validation provider services (third-party implementations).
 *
 * Providers are responsible for:
 * - Actual validation logic using third-party APIs
 * - Mapping provider-specific responses to canonical EmailValidationStatus
 * - Provider-specific error handling and timeouts
 *
 * Note: Providers should NOT determine blocking logic. The canonical statuses
 * have universal meanings, and blocking decisions are centralized in EmailValidationService.
 */
export interface IEmailValidationProviderService {
  validateEmail(request: EmailValidationRequest, signal?: AbortSignal): Promise<EmailValidationResult>;
}
