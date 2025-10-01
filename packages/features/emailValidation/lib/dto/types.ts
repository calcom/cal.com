import { z } from "zod";

export interface EmailValidationRequest {
  email: string;
  ipAddress?: string;
}

/**
 * Canonical email validation statuses that all providers must map to.
 *
 * Status definitions based on ZeroBounce API documentation.
 */
export const validationStatusSchema = z.enum([
  /**
   * Email is verified by Cal.com user account
   */
  "calcom-verified-email",
  /**
   * Provider validation unsuccessful/timed out, allowing booking temporarily and avoiding hammering the provider
   */
  "calcom-provider-fallback",
  /**
   * Confirmed to be valid and safe to email, with a very low bounce rate
   */
  "valid",
  /**
   * Email addresses determined to be invalid
   */
  "invalid",
  /**
   * Email servers configured to accept all emails, making it impossible to validate without sending a real email
   */
  "catch-all",
  /**
   * Addresses that couldn't be validated for various reasons (offline mail server, anti-spam systems, etc.)
   */
  "unknown",
  /**
   * Email addresses believed to be spam traps; sending to these can harm your sender reputation
   */
  "spamtrap",
  /**
   * Email addresses associated with individuals known to mark emails as spam or abuse
   */
  "abuse",
  /**
   * Addresses that are valid but should be avoided (disposable, role-based, toxic, etc.)
   */
  "do-not-mail",
]);

export type EmailValidationStatus = z.infer<typeof validationStatusSchema>;

export interface EmailValidationResult {
  /**
   * The validation status from the canonical set above.
   * Providers are responsible for mapping their API responses to these statuses.
   */
  status: EmailValidationStatus;
  /**
   * Optional provider-specific sub-status for additional context.
   * This is NOT used for blocking decisions, only for logging/debugging.
   */
  subStatus?: string;
}
