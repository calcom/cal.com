import logger from "@calcom/lib/logger";

import type {
  IGlobalWatchlistRepository,
  IOrganizationWatchlistRepository,
} from "../interface/IWatchlistRepositories";
import type { IWatchlistService } from "../interface/IWatchlistService";
import type { WatchlistEntry, CreateWatchlistEntryData, UpdateWatchlistEntryData } from "../types";

const log = logger.getSubLogger({ prefix: ["[WatchlistService]"] });

export class WatchlistService implements IWatchlistService {
  constructor(
    private readonly globalRepo: IGlobalWatchlistRepository,
    private readonly orgRepo: IOrganizationWatchlistRepository
  ) {}

  async createEntry(data: CreateWatchlistEntryData): Promise<WatchlistEntry> {
    try {
      log.debug("Creating watchlist entry", {
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

      log.info("Watchlist entry created successfully", {
        id: entry.id,
        type: entry.type,
        isGlobal: entry.isGlobal,
        organizationId: entry.organizationId,
      });

      return entry;
    } catch (error) {
      log.error("Failed to create watchlist entry", {
        error: error instanceof Error ? error.message : String(error),
        data,
      });
      throw error;
    }
  }

  async updateEntry(id: string, data: UpdateWatchlistEntryData): Promise<WatchlistEntry> {
    try {
      log.debug("Updating watchlist entry", { id });

      const entry = await this.globalRepo.updateEntry(id, data);

      log.info("Watchlist entry updated successfully", {
        id: entry.id,
        type: entry.type,
      });

      return entry;
    } catch (error) {
      log.error("Failed to update watchlist entry", {
        error: error instanceof Error ? error.message : String(error),
        id,
        data,
      });
      throw error;
    }
  }

  async deleteEntry(id: string): Promise<void> {
    try {
      log.debug("Deleting watchlist entry", { id });

      await this.globalRepo.deleteEntry(id);

      log.info("Watchlist entry deleted successfully", { id });
    } catch (error) {
      log.error("Failed to delete watchlist entry", {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  async getEntry(id: string): Promise<WatchlistEntry | null> {
    try {
      log.debug("Fetching watchlist entry", { id });

      // First try to find in global entries
      const globalEntry = await this.globalRepo.findById(id);
      if (globalEntry) {
        log.debug("Global watchlist entry found", { id, type: globalEntry.type });
        return globalEntry;
      }

      // If not found in global, it might be an organization-specific entry
      // Since we don't have organizationId, we can only find global entries with this method
      log.debug("Entry not found in global repository", { id });
      return null;
    } catch (error) {
      log.error("Failed to fetch watchlist entry", {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  async listAllEntries(organizationId?: number): Promise<WatchlistEntry[]> {
    try {
      log.debug("Listing watchlist entries", { organizationId });

      const globalEntries = await this.globalRepo.listBlockedEntries();

      let combinedEntries: WatchlistEntry[] = [...globalEntries];

      if (organizationId) {
        const orgEntries = await this.orgRepo.listBlockedEntries(organizationId);
        combinedEntries = [...globalEntries, ...orgEntries];
      }

      log.debug("Watchlist entries retrieved", {
        globalCount: globalEntries.length,
        orgCount: organizationId ? combinedEntries.length - globalEntries.length : 0,
        totalCount: combinedEntries.length,
        organizationId,
      });

      return combinedEntries;
    } catch (error) {
      log.error("Failed to list watchlist entries", {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      throw error;
    }
  }
}
