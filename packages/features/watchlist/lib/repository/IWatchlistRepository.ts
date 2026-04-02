import type { WatchlistAction, WatchlistSource, WatchlistType } from "@calcom/prisma/enums";

export interface WatchlistEntry {
  id: string;
  type: WatchlistType;
  value: string;
  action: WatchlistAction;
  description: string | null;
  organizationId: number | null;
  isGlobal: boolean;
  source: WatchlistSource;
  createdAt?: Date;
  lastUpdatedAt?: Date;
}

export interface WatchlistAuditEntry {
  id: string;
  watchlistId: string | null;
  type: WatchlistType;
  value: string;
  description: string | null;
  action: WatchlistAction;
  eventType?: string;
  changedByUserId: number | null;
  changedAt: Date;
}

export interface CreateWatchlistInput {
  type: WatchlistType;
  value: string;
  organizationId: number | null;
  action: WatchlistAction;
  description?: string;
  userId: number;
  isGlobal?: boolean;
}

export interface CheckWatchlistInput {
  type: WatchlistType;
  value: string;
  organizationId?: number | null;
  isGlobal?: boolean;
}

export interface FindAllEntriesInput {
  organizationId?: number | null;
  isGlobal?: boolean;
  limit: number;
  offset: number;
  searchTerm?: string;
  filters?: {
    type?: WatchlistType;
    source?: WatchlistSource;
  };
}

export interface IWatchlistRepository {
  createEntry(params: CreateWatchlistInput): Promise<WatchlistEntry>;
  createEntryIfNotExists(params: CreateWatchlistInput): Promise<WatchlistEntry>;
  checkExists(params: CheckWatchlistInput): Promise<WatchlistEntry | null>;
  findAllEntriesWithLatestAudit(params: FindAllEntriesInput): Promise<{
    rows: (WatchlistEntry & {
      latestAudit: { changedByUserId: number | null } | null;
    })[];
    meta: { totalRowCount: number };
  }>;
  findEntryWithAuditAndReports(id: string): Promise<{
    entry:
      | (WatchlistEntry & {
          bookingReports?: Array<{
            booking: {
              uid: string;
              title: string | null;
            };
          }>;
        })
      | null;
    auditHistory: WatchlistAuditEntry[];
  }>;
  findEntriesByIds(ids: string[]): Promise<
    Array<{
      id: string;
      isGlobal: boolean;
      organizationId: number | null;
    }>
  >;
  deleteEntry(id: string, userId: number): Promise<void>;
  bulkDeleteEntries(params: { ids: string[]; userId: number }): Promise<{ deleted: number }>;
}
