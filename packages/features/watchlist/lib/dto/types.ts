import type { WatchlistAction, WatchlistType, WatchlistSource } from "@calcom/prisma/enums";

// Base DTOs for API responses
export interface WatchlistEntryDTO {
  id: string;
  type: WatchlistType;
  value: string;
  description?: string | null;
  action: WatchlistAction;
  source: WatchlistSource;
  isGlobal: boolean;
  lastUpdatedAt: string;
  organizationId?: number | null;
  createdBy?: {
    id: number;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  } | null;
  updatedBy?: {
    id: number;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

export interface BlockedBookingLogDTO {
  id: string;
  email: string;
  eventTypeId?: number | null;
  organizationId?: number | null;
  createdAt: string;
  watchlistId?: string | null;
  bookingData?: Record<string, unknown> | null;
  watchlistEntry?: {
    id: string;
    type: WatchlistType;
    value: string;
    action: WatchlistAction;
  } | null;
}

// Request DTOs for creating/updating entries
export interface CreateWatchlistEntryDTO {
  type: WatchlistType;
  value: string;
  description?: string;
  action?: WatchlistAction;
  organizationId?: number;
}

export interface UpdateWatchlistEntryDTO {
  value?: string;
  description?: string;
  action?: WatchlistAction;
}

// Response DTOs for API operations
export interface WatchlistListResponseDTO {
  entries: WatchlistEntryDTO[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface BlockingStatsDTO {
  totalBlocked: number;
  blockedByEmail: number;
  blockedByDomain: number;
  organizationId: number;
  periodStart?: string;
  periodEnd?: string;
}

export interface BlockedBookingLogsResponseDTO {
  logs: BlockedBookingLogDTO[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// Search and filter DTOs
export interface WatchlistSearchDTO {
  query?: string;
  type?: WatchlistType;
  action?: WatchlistAction;
  source?: WatchlistSource;
  isGlobal?: boolean;
  organizationId?: number;
  page?: number;
  limit?: number;
}

export interface BlockingCheckResultDTO {
  isBlocked: boolean;
  reason?: WatchlistType;
  matchedEntry?: {
    id: string;
    type: WatchlistType;
    value: string;
    action: WatchlistAction;
  };
}

// Controller response DTOs (for the existing controllers)
export interface EmailBlockedCheckResponseDTO {
  isBlocked: boolean;
}

export interface UsersBlockedCheckResponseDTO {
  containsBlockedUser: boolean;
}

// Error DTOs
export interface WatchlistErrorDTO {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

// Bulk operations DTOs
export interface BulkWatchlistOperationDTO {
  entries: CreateWatchlistEntryDTO[];
  organizationId?: number;
}

export interface BulkWatchlistResultDTO {
  created: WatchlistEntryDTO[];
  failed: Array<{
    entry: CreateWatchlistEntryDTO;
    error: WatchlistErrorDTO;
  }>;
  summary: {
    total: number;
    created: number;
    failed: number;
  };
}
