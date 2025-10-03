import type { Watchlist, CreateWatchlistInput, UpdateWatchlistInput } from "../types";

export interface IWatchlistReadRepository {
  findBlockedEntry(email: string, organizationId?: number): Promise<Watchlist | null>;
  findBlockedDomain(domain: string, organizationId?: number): Promise<Watchlist | null>;
  listByOrganization(organizationId: number): Promise<Watchlist[]>;
  findById(id: string): Promise<Watchlist | null>;
  findMany(params: { organizationId?: number; isGlobal?: boolean }): Promise<Watchlist[]>;

  // Legacy methods for backward compatibility
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
  deleteEntry(id: string): Promise<void>;
  updateEntry(id: string, data: UpdateWatchlistInput): Promise<Watchlist>;
}

export interface IWatchlistRepository extends IWatchlistReadRepository, IWatchlistWriteRepository {
  // Combined interface that includes both read and write operations
  create(data: CreateWatchlistInput): Promise<Watchlist>;
  update(id: string, data: UpdateWatchlistInput): Promise<Watchlist>;
  delete(id: string): Promise<void>;
}

// Export the input types for use in other files
export type { CreateWatchlistInput, UpdateWatchlistInput };
