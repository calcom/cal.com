import type { WatchlistEventAudit, WatchlistAudit } from "../types";

export interface CreateWatchlistEventAuditInput {
  watchlistId: string;
  eventTypeId: number;
  actionTaken: string;
}

export interface CreateWatchlistAuditInput {
  type: string;
  value: string;
  description?: string;
  action: string;
  changedByUserId?: number;
  watchlistId: string;
}

export interface IAuditRepository {
  // WatchlistEventAudit methods (replaces BlockedBookingLog)
  createEventAudit(data: CreateWatchlistEventAuditInput): Promise<WatchlistEventAudit>;
  getEventAuditsByOrganization(organizationId: number): Promise<WatchlistEventAudit[]>;
  getBlockingStats(organizationId: number): Promise<{
    totalBlocked: number;
    blockedByEmail: number;
    blockedByDomain: number;
  }>;

  // WatchlistAudit methods for tracking changes
  createChangeAudit(data: CreateWatchlistAuditInput): Promise<WatchlistAudit>;
  getChangeHistory(watchlistId: string): Promise<WatchlistAudit[]>;

  // Legacy method names for backward compatibility
  createBlockedBookingEntry(data: CreateWatchlistEventAuditInput): Promise<WatchlistEventAudit>;
  getBlockedBookingsByOrganization(organizationId: number): Promise<WatchlistEventAudit[]>;
}

// Export input types
export type { CreateWatchlistEventAuditInput, CreateWatchlistAuditInput };
