import type { EmailValidationRequest } from "../dto/types";

export interface EmailValidationResponse {
  shouldBlock: boolean;
}

export type EmailValidationAndCacheResponse = {
  shouldBlock: boolean;
  continueWithProvider: boolean;
};

export interface IEmailValidationService {
  /**
   * Validates if an email is verified by Cal.com.
   * Checks cache first, then Cal.com DB.
   *
   * @param email - Email address to validate
   * @returns Validation result with shouldBlock flag, or null if not verified by Cal.com
   */
  validateWithCalcom(email: string): Promise<EmailValidationAndCacheResponse>;

  /**
   * Validates email with external provider (ZeroBounce).
   * Assumes cache was already checked by validateWithCalcom.
   * Directly calls provider with timeout, then caches result.
   *
   * @param params - Object containing:
   *   - request: Email validation request with email and optional IP
   *   - skipCache: If true, skip cache; if false, throw error (cache flow not implemented yet). Defaults to false.
   * @returns Validation result with shouldBlock flag
   */
  validateWithProvider(params: {
    request: EmailValidationRequest;
    skipCache: true;
  }): Promise<EmailValidationResponse>;
}
