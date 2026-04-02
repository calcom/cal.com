import { WatchlistAction, WatchlistSource, WatchlistType } from "@calcom/prisma/enums";

export { WatchlistAction, WatchlistType, WatchlistSource };

export interface Watchlist {
  id: string;
  type: WatchlistType;
  value: string;
  description?: string | null;
  isGlobal: boolean;
  organizationId?: number | null;
  action: WatchlistAction;
  source: WatchlistSource;
  lastUpdatedAt: Date;
}

export interface WatchlistAudit {
  id: string;
  type: WatchlistType;
  value: string;
  description?: string | null;
  action: WatchlistAction;
  changedAt: Date;
  changedByUserId?: number | null;
  watchlistId: string | null;
}

export interface WatchlistEventAudit {
  id: string;
  watchlistId: string;
  eventTypeId: number;
  actionTaken: WatchlistAction;
  timestamp: Date;
}

// Input types for creating/updating watchlist entries
export interface CreateWatchlistInput {
  type: WatchlistType;
  value: string;
  description?: string;
  isGlobal?: boolean;
  organizationId?: number;
  action: WatchlistAction;
  source?: WatchlistSource;
}

export interface UpdateWatchlistInput {
  type: WatchlistType; // Required to normalize value correctly without fetching
  value?: string;
  description?: string;
  action?: WatchlistAction;
  source?: WatchlistSource;
}

// Alias types for the service interface
export type WatchlistEntry = Watchlist;
export type CreateWatchlistEntryData = CreateWatchlistInput;
export type UpdateWatchlistEntryData = UpdateWatchlistInput;

// Type aliases for convenience
export type WatchlistEvent = WatchlistEventAudit;
