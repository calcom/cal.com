import type { WatchlistType, WatchlistAction, WatchlistSource } from "@calcom/prisma/enums";

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
  watchlistId: string;
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
  organizationId: number;
  action: WatchlistAction;
  description?: string;
  userId: number;
}

export interface CheckWatchlistInput {
  type: WatchlistType;
  value: string;
  organizationId: number;
}

export interface FindAllEntriesInput {
  organizationId: number;
  limit: number;
  offset: number;
  searchTerm?: string;
  filters?: {
    type?: WatchlistType;
  };
}

export interface IWatchlistRepository {
  createEntry(params: CreateWatchlistInput): Promise<WatchlistEntry>;
  checkExists(params: CheckWatchlistInput): Promise<WatchlistEntry | null>;
  findAllEntries(params: FindAllEntriesInput): Promise<{
    rows: (WatchlistEntry & {
      audits?: { changedByUserId: number | null }[];
    })[];
    meta: { totalRowCount: number };
  }>;
  findEntryWithAudit(id: string): Promise<{
    entry: WatchlistEntry | null;
    auditHistory: WatchlistAuditEntry[];
  }>;
  deleteEntry(id: string, userId: number): Promise<void>;
}
