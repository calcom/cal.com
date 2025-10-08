import type { ILogger } from "@calcom/features/webhooks/lib/interface/infrastructure";

import type {
  IGlobalWatchlistRepository,
  IOrganizationWatchlistRepository,
} from "../interface/IWatchlistRepositories";
import type { IWatchlistService } from "../interface/IWatchlistService";
import type { WatchlistEntry, CreateWatchlistEntryData, UpdateWatchlistEntryData } from "../types";

export class WatchlistService implements IWatchlistService {
  private readonly log: ILogger;

  constructor(
    private readonly globalRepo: IGlobalWatchlistRepository,
    private readonly orgRepo: IOrganizationWatchlistRepository,
    logger: ILogger
  ) {
    this.log = logger.getSubLogger({ prefix: ["[WatchlistService]"] });
  }

  async createEntry(data: CreateWatchlistEntryData): Promise<WatchlistEntry> {
    try {
      this.log.debug("Creating watchlist entry", {
        type: data.type,
        organizationId: data.organizationId,
        isGlobal: data.isGlobal,
      });

      const isGlobal = data.isGlobal ?? false;
      let entry: WatchlistEntry;

      if (isGlobal || !data.organizationId) {
        // Create global entry
        entry = await this.globalRepo.createEntry({
          type: data.type,
          value: data.value,
          description: data.description,
          action: data.action,
          source: data.source,
        });
      } else {
        // Create organization-specific entry
        entry = await this.orgRepo.createEntry(data.organizationId, {
          type: data.type,
          value: data.value,
          description: data.description,
          action: data.action,
          source: data.source,
        });
      }

      this.log.info("Watchlist entry created successfully", {
        id: entry.id,
        type: entry.type,
        isGlobal: entry.isGlobal,
        organizationId: entry.organizationId,
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

      const entry = await this.globalRepo.updateEntry(id, data);

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

      await this.globalRepo.deleteEntry(id);

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

      // First try to find in global entries
      const globalEntry = await this.globalRepo.findById(id);
      if (globalEntry) {
        this.log.debug("Global watchlist entry found", { id, type: globalEntry.type });
        return globalEntry;
      }

      // If not found in global, it might be an organization-specific entry
      // Since we don't have organizationId, we can only find global entries with this method
      this.log.debug("Entry not found in global repository", { id });
      return null;
    } catch (error) {
      this.log.error("Failed to fetch watchlist entry", {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  async listAllEntries(organizationId?: number): Promise<WatchlistEntry[]> {
    try {
      this.log.debug("Listing watchlist entries", { organizationId });

      const globalEntries = await this.globalRepo.listBlockedEntries();

      let combinedEntries: WatchlistEntry[] = [...globalEntries];

      if (organizationId) {
        const orgEntries = await this.orgRepo.listBlockedEntries(organizationId);
        combinedEntries = [...globalEntries, ...orgEntries];
      }

      this.log.debug("Watchlist entries retrieved", {
        globalCount: globalEntries.length,
        orgCount: organizationId ? combinedEntries.length - globalEntries.length : 0,
        totalCount: combinedEntries.length,
        organizationId,
      });

      return combinedEntries;
    } catch (error) {
      this.log.error("Failed to list watchlist entries", {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      throw error;
    }
  }
}
