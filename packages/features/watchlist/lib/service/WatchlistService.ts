import type { ILogger } from "@calcom/features/webhooks/lib/interface/infrastructure";

import type { IWatchlistRepository } from "../interface/IWatchlistRepositories";
import type { IWatchlistService } from "../interface/IWatchlistService";
import type { WatchlistEntry, CreateWatchlistEntryData, UpdateWatchlistEntryData } from "../types";

export class WatchlistService implements IWatchlistService {
  private readonly log: ILogger;

  constructor(private readonly repository: IWatchlistRepository, logger: ILogger) {
    this.log = logger.getSubLogger({ prefix: ["[WatchlistService]"] });
  }

  async createEntry(data: CreateWatchlistEntryData): Promise<WatchlistEntry> {
    try {
      this.log.debug("Creating watchlist entry", {
        type: data.type,
        organizationId: data.organizationId,
      });

      const entry = await this.repository.create(data);

      this.log.info("Watchlist entry created successfully", {
        id: entry.id,
        type: entry.type,
      });

      return entry;
    } catch (error) {
      this.log.error("Failed to create watchlist entry", {
        error: error instanceof Error ? error.message : String(error),
        data,
      });
      throw error;
    }
  }

  async updateEntry(id: string, data: UpdateWatchlistEntryData): Promise<WatchlistEntry> {
    try {
      this.log.debug("Updating watchlist entry", { id });

      const entry = await this.repository.update(id, data);

      this.log.info("Watchlist entry updated successfully", {
        id: entry.id,
        type: entry.type,
      });

      return entry;
    } catch (error) {
      this.log.error("Failed to update watchlist entry", {
        error: error instanceof Error ? error.message : String(error),
        id,
        data,
      });
      throw error;
    }
  }

  async deleteEntry(id: string): Promise<void> {
    try {
      this.log.debug("Deleting watchlist entry", { id });

      await this.repository.delete(id);

      this.log.info("Watchlist entry deleted successfully", { id });
    } catch (error) {
      this.log.error("Failed to delete watchlist entry", {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  async getEntry(id: string): Promise<WatchlistEntry | null> {
    try {
      this.log.debug("Fetching watchlist entry", { id });

      const entry = await this.repository.findById(id);

      if (entry) {
        this.log.debug("Watchlist entry found", { id, type: entry.type });
      } else {
        this.log.debug("Watchlist entry not found", { id });
      }

      return entry;
    } catch (error) {
      this.log.error("Failed to fetch watchlist entry", {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  async listEntries(organizationId?: number): Promise<WatchlistEntry[]> {
    try {
      this.log.debug("Listing watchlist entries", { organizationId });

      const entries = await this.repository.findMany({ organizationId });

      this.log.debug("Watchlist entries retrieved", {
        count: entries.length,
        organizationId,
      });

      return entries;
    } catch (error) {
      this.log.error("Failed to list watchlist entries", {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      throw error;
    }
  }

  async isBlocked(email: string, organizationId?: number): Promise<boolean> {
    try {
      this.log.debug("Checking if email is blocked", { email, organizationId });

      // Check for exact email match
      const emailEntry = await this.repository.findBlockedEntry(email, organizationId);
      if (emailEntry) {
        this.log.info("Email blocked by exact match", {
          email,
          organizationId,
          entryId: emailEntry.id,
        });
        return true;
      }

      // Check for domain match
      const domain = email.split("@")[1];
      if (domain) {
        const domainEntry = await this.repository.findBlockedDomain(`@${domain}`, organizationId);
        if (domainEntry) {
          this.log.info("Email blocked by domain match", {
            email,
            domain,
            organizationId,
            entryId: domainEntry.id,
          });
          return true;
        }
      }

      this.log.debug("Email not blocked", { email, organizationId });
      return false;
    } catch (error) {
      this.log.error("Failed to check if email is blocked", {
        error: error instanceof Error ? error.message : String(error),
        email,
        organizationId,
      });
      // In case of error, default to not blocked to avoid false positives
      return false;
    }
  }
}
