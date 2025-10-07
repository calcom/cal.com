import type { Watchlist } from "@calcom/prisma/client";

/**
 * Interface for Global Watchlist Repository
 * Follows Dependency Inversion Principle
 */
export interface IGlobalWatchlistRepository {
  findBlockedEmail(email: string): Promise<Watchlist | null>;
  findBlockedDomain(domain: string): Promise<Watchlist | null>;
  findFreeEmailDomain(domain: string): Promise<Watchlist | null>;
  findReportedEmail(email: string): Promise<Watchlist | null>;
  findReportedDomain(domain: string): Promise<Watchlist | null>;
  listAllGlobalEntries(): Promise<Watchlist[]>;
  listGlobalBlockedEntries(): Promise<Watchlist[]>;

  // Write operations
  createEntry(data: {
    type: import("../types").WatchlistType;
    value: string;
    description?: string;
    action: import("../types").WatchlistAction;
    source?: import("../types").WatchlistSource;
  }): Promise<Watchlist>;

  updateEntry(
    id: string,
    data: {
      value?: string;
      description?: string;
      action?: import("../types").WatchlistAction;
      source?: import("../types").WatchlistSource;
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
  findReportedEmail(email: string, organizationId: number): Promise<Watchlist | null>;
  findReportedDomain(domain: string, organizationId: number): Promise<Watchlist | null>;
  listOrganizationEntries(organizationId: number): Promise<Watchlist[]>;
  listOrganizationBlockedEntries(organizationId: number): Promise<Watchlist[]>;

  // Write operations
  createEntry(
    organizationId: number,
    data: {
      type: import("../types").WatchlistType;
      value: string;
      description?: string;
      action: import("../types").WatchlistAction;
      source?: import("../types").WatchlistSource;
    }
  ): Promise<Watchlist>;

  updateEntry(
    id: string,
    organizationId: number,
    data: {
      value?: string;
      description?: string;
      action?: import("../types").WatchlistAction;
      source?: import("../types").WatchlistSource;
    }
  ): Promise<Watchlist>;

  deleteEntry(id: string, organizationId: number): Promise<void>;
}
