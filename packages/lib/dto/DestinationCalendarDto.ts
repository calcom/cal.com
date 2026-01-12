/**
 * Destination Calendar DTOs - Data Transfer Objects for destination calendar data
 */

/**
 * Destination calendar information
 */
export interface DestinationCalendarDto {
  id: number;
  integration: string;
  externalId: string;
  primaryEmail: string | null;
  userId: number | null;
  eventTypeId: number | null;
  credentialId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  delegationCredentialId: string | null;
  domainWideDelegationCredentialId: string | null;
}
