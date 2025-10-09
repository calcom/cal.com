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
    log.debug("Creating watchlist entry", {
      type: data.type,
      organizationId: data.organizationId,
      isGlobal: data.isGlobal,
    });

    const isGlobal = data.isGlobal ?? false;

    const entryPromise =
      isGlobal || !data.organizationId
        ? this.globalRepo.createEntry({
            type: data.type,
            value: data.value,
            description: data.description,
            action: data.action,
            source: data.source,
          })
        : this.orgRepo.createEntry(data.organizationId, {
            type: data.type,
            value: data.value,
            description: data.description,
            action: data.action,
            source: data.source,
          });

    return entryPromise.then((entry) => {
      log.info("Watchlist entry created successfully", {
        id: entry.id,
        type: entry.type,
        isGlobal: entry.isGlobal,
        organizationId: entry.organizationId,
      });
      return entry;
    });
  }

  async updateEntry(id: string, data: UpdateWatchlistEntryData): Promise<WatchlistEntry> {
    log.debug("Updating watchlist entry", { id });

    return this.globalRepo.updateEntry(id, data).then((entry) => {
      log.info("Watchlist entry updated successfully", {
        id: entry.id,
        type: entry.type,
      });
      return entry;
    });
  }

  async deleteEntry(id: string): Promise<void> {
    log.debug("Deleting watchlist entry", { id });

    return this.globalRepo.deleteEntry(id).then(() => {
      log.info("Watchlist entry deleted successfully", { id });
    });
  }

  async getEntry(id: string): Promise<WatchlistEntry | null> {
    log.debug("Fetching watchlist entry", { id });

    return this.globalRepo.findById(id).then((globalEntry) => {
      if (globalEntry) {
        log.debug("Global watchlist entry found", { id, type: globalEntry.type });
        return globalEntry;
      }

      // If not found in global, it might be an organization-specific entry
      // Since we don't have organizationId, we can only find global entries with this method
      log.debug("Entry not found in global repository", { id });
      return null;
    });
  }

  async listAllEntries(organizationId?: number): Promise<WatchlistEntry[]> {
    log.debug("Listing watchlist entries", { organizationId });

    // Prepare repository calls
    const globalEntriesPromise = this.globalRepo.listBlockedEntries();
    const orgEntriesPromise = organizationId
      ? this.orgRepo.listBlockedEntries(organizationId)
      : Promise.resolve([]);

    // Execute both calls in parallel
    const [globalEntries, orgEntries] = await Promise.all([globalEntriesPromise, orgEntriesPromise]);

    const combinedEntries = [...globalEntries, ...orgEntries];

    log.debug("Watchlist entries retrieved", {
      globalCount: globalEntries.length,
      orgCount: orgEntries.length,
      totalCount: combinedEntries.length,
      organizationId,
    });

    return combinedEntries;
  }
}
