import type { Watchlist } from "@calcom/prisma/client";

import type { WatchlistAction, WatchlistSource, WatchlistType } from "../types";

/**
 * Interface for Global Watchlist Repository
 * Follows Dependency Inversion Principle
 */
export interface IGlobalWatchlistRepository {
  findBlockedEmail(email: string): Promise<Watchlist | null>;
  findBlockedDomain(domain: string): Promise<Watchlist | null>;
  findFreeEmailDomain(domain: string): Promise<Watchlist | null>;
  findById(id: string): Promise<Watchlist | null>;
  listBlockedEntries(): Promise<Watchlist[]>;

  /**
   * Bulk find blocking entries for multiple emails and domains.
   * Single query for N emails and domains - eliminates N+1.
   */
  findBlockingEntriesForEmailsAndDomains(params: {
    emails: string[];
    domains: string[];
  }): Promise<Watchlist[]>;

  // Write operations
  createEntry(data: {
    type: WatchlistType;
    value: string;
    description?: string;
    action: WatchlistAction;
    source?: WatchlistSource;
  }): Promise<Watchlist>;

  updateEntry(
    id: string,
    data: {
      value?: string;
      description?: string;
      action?: WatchlistAction;
      source?: WatchlistSource;
    }
  ): Promise<Watchlist>;

  deleteEntry(id: string): Promise<void>;
}

/**
 * Interface for Organization Watchlist Repository
 * Follows Dependency Inversion Principle
 */
export interface IOrganizationWatchlistRepository {
  findBlockedEmail({
    email,
    organizationId,
  }: {
    email: string;
    organizationId: number;
  }): Promise<Watchlist | null>;
  findBlockedDomain(domain: string, organizationId: number): Promise<Watchlist | null>;
  findById(id: string, organizationId: number): Promise<Watchlist | null>;
  listBlockedEntries(organizationId: number): Promise<Watchlist[]>;
  listAllOrganizationEntries(): Promise<Watchlist[]>;

  /**
   * Bulk find blocking entries for multiple emails and domains within an organization.
   * Single query for N emails and domains - eliminates N+1.
   */
  findBlockingEntriesForEmailsAndDomains(params: {
    emails: string[];
    domains: string[];
    organizationId: number;
  }): Promise<Watchlist[]>;

  // Write operations
  createEntry(
    organizationId: number,
    data: {
      type: WatchlistType;
      value: string;
      description?: string;
      action: WatchlistAction;
      source?: WatchlistSource;
    }
  ): Promise<Watchlist>;

  updateEntry(
    id: string,
    organizationId: number,
    data: {
      value?: string;
      description?: string;
      action?: WatchlistAction;
      source?: WatchlistSource;
    }
  ): Promise<Watchlist>;

  deleteEntry(id: string, organizationId: number): Promise<void>;
}
