export interface EmailValidationRequest {
  email: string;
  ipAddress?: string;
}

export interface EmailValidationResult {
  /**
   * calcom-verified-email: email is verified by Cal.com itself
   * calcom-cache-fallback: Lookup in Cache failed, so assuming the email is valid
   * calcom-provider-fallback: Lookup in Provider failed, so assuming the email is valid
   *
   * It could be other Provider specific statuses as well, which are checked by the ProviderService itself whether to block the email or not
   */
  status: string;
  subStatus?: string;
}

export type EmailValidationStatus = EmailValidationResult["status"];
