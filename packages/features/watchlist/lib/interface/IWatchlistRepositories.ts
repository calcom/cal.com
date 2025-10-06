import type { Watchlist, CreateWatchlistInput, UpdateWatchlistInput } from "../types";

export interface IWatchlistRepository {
  // Read operations
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

  // Write operations
  create(data: CreateWatchlistInput): Promise<Watchlist>;
  createEntry(data: CreateWatchlistInput): Promise<Watchlist>;
  update(id: string, data: UpdateWatchlistInput): Promise<Watchlist>;
  updateEntry(id: string, data: UpdateWatchlistInput): Promise<Watchlist>;
  delete(id: string): Promise<void>;
  deleteEntry(id: string): Promise<void>;
}

// Export the input types for use in other files
export type { CreateWatchlistInput, UpdateWatchlistInput };
