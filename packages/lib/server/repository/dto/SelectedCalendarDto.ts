/**
 * ORM-agnostic DTOs for SelectedCalendar repository
 * These types abstract away the underlying database implementation
 */

/**
 * Core SelectedCalendar DTO - represents a user's selected calendar
 */
export interface SelectedCalendarDto {
  id: string;
  userId: number;
  integration: string;
  externalId: string;
  credentialId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  googleChannelId: string | null;
  googleChannelKind: string | null;
  googleChannelResourceId: string | null;
  googleChannelResourceUri: string | null;
  googleChannelExpiration: string | null;
  channelId: string | null;
  channelKind: string | null;
  channelResourceId: string | null;
  channelResourceUri: string | null;
  channelExpiration: Date | null;
  syncSubscribedAt: Date | null;
  syncToken: string | null;
  syncedAt: Date | null;
  syncErrorAt: Date | null;
  syncErrorCount: number | null;
  delegationCredentialId: string | null;
  domainWideDelegationCredentialId: string | null;
  error: string | null;
  lastErrorAt: Date | null;
}

/**
 * Input DTO for updating sync status
 */
export interface UpdateSyncStatusInputDto {
  syncToken?: string | null;
  syncedAt?: Date | null;
  syncErrorAt?: Date | null;
  syncErrorCount?: number | null;
}

/**
 * Input DTO for updating subscription
 */
export interface UpdateSubscriptionInputDto {
  channelId?: string | null;
  channelResourceId?: string | null;
  channelResourceUri?: string | null;
  channelKind?: string | null;
  channelExpiration?: Date | null;
  syncSubscribedAt?: Date | null;
}

/**
 * Input DTO for finding next subscription batch
 */
export interface FindNextSubscriptionBatchInputDto {
  take: number;
  teamIds: number[];
  integrations: string[];
}
