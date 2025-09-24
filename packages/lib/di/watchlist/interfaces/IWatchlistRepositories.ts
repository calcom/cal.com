import type { WatchlistType, WatchlistAction, Watchlist } from "../types";

export interface CreateWatchlistInput {
  type: WatchlistType;
  value: string;
  description?: string;
  organizationId?: number;
  createdById: number;
  action?: WatchlistAction;
}

export interface UpdateWatchlistInput {
  value?: string;
  description?: string;
}

export interface IWatchlistReadRepository {
  findBlockedEntry(email: string, organizationId?: number): Promise<Watchlist | null>;
  findBlockedDomain(domain: string, organizationId?: number): Promise<Watchlist | null>;
  listByOrganization(organizationId: number): Promise<Watchlist[]>;
  getBlockedEmailInWatchlist(email: string): Promise<Watchlist | null>;
  getFreeEmailDomainInWatchlist(emailDomain: string): Promise<Watchlist | null>;
  searchForAllBlockedRecords(params: {
    usernames: string[];
    emails: string[];
    domains: string[];
  }): Promise<Watchlist[]>;
}

export interface IWatchlistWriteRepository {
  createEntry(data: CreateWatchlistInput): Promise<Watchlist>;
  deleteEntry(id: string, organizationId: number): Promise<void>;
  updateEntry(id: string, data: UpdateWatchlistInput): Promise<Watchlist>;
}

export interface IWatchlistRepository extends IWatchlistReadRepository, IWatchlistWriteRepository {
  // Combined interface that includes both read and write operations
}
