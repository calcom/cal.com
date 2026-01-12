/**
 * Credential DTOs - Data Transfer Objects for credential data
 * Note: key is intentionally NOT included to avoid leaking sensitive data
 */

/**
 * Credential information for calendar services
 */
export interface CredentialDto {
  id: number;
  type: string;
  userId: number | null;
  teamId: number | null;
  appId: string | null;
  subscriptionId: string | null;
  paymentStatus: string | null;
  billingCycleStart: number | null;
  invalid: boolean | null;
}
