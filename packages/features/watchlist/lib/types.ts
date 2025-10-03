// Import and export the enums from Prisma
import { WatchlistAction, WatchlistType, WatchlistSource } from "@calcom/prisma/enums";

export { WatchlistAction, WatchlistType, WatchlistSource };

// Define the core Watchlist type based on the new database schema
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

// Define WatchlistAudit type for tracking changes to watchlist entries
export interface WatchlistAudit {
  id: string;
  type: WatchlistType;
  value: string;
  description?: string | null;
  action: WatchlistAction;
  changedAt: Date;
  changedByUserId?: number | null;
  watchlistId: string;
}

// Define WatchlistEventAudit type for tracking when watchlist rules are triggered
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
  type?: WatchlistType;
  value?: string;
  description?: string;
  action?: WatchlistAction;
  source?: WatchlistSource;
}

// Alias types for the service interface
export type WatchlistEntry = Watchlist;
export type CreateWatchlistEntryData = CreateWatchlistInput;
export type UpdateWatchlistEntryData = UpdateWatchlistInput;

// Legacy type alias for backward compatibility
export type BlockedBooking = WatchlistEventAudit;
