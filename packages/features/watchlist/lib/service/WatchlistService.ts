import logger from "@calcom/lib/logger";

import type {
  IGlobalWatchlistRepository,
  IOrganizationWatchlistRepository,
} from "../interface/IWatchlistRepositories";
import type { IWatchlistService } from "../interface/IWatchlistService";
import type { WatchlistEntry, CreateWatchlistEntryData, UpdateWatchlistEntryData } from "../types";

const log = logger.getSubLogger({ prefix: ["[WatchlistService]"] });

type Deps = {
  globalRepo: IGlobalWatchlistRepository;
  orgRepo: IOrganizationWatchlistRepository;
};

export class WatchlistService implements IWatchlistService {
  constructor(private readonly deps: Deps) {}

  async createEntry(data: CreateWatchlistEntryData): Promise<WatchlistEntry> {
    log.debug("Creating watchlist entry", {
      type: data.type,
      organizationId: data.organizationId,
      isGlobal: data.isGlobal,
    });

    const isGlobal = data.isGlobal ?? false;

    const entryPromise =
      isGlobal || !data.organizationId
        ? this.deps.globalRepo.createEntry({
            type: data.type,
            value: data.value,
            description: data.description,
            action: data.action,
            source: data.source,
          })
        : this.deps.orgRepo.createEntry(data.organizationId, {
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

    return this.deps.globalRepo.updateEntry(id, data).then((entry) => {
      log.info("Watchlist entry updated successfully", {
        id: entry.id,
        type: entry.type,
      });
      return entry;
    });
  }

  async deleteEntry(id: string): Promise<void> {
    log.debug("Deleting watchlist entry", { id });

    return this.deps.globalRepo.deleteEntry(id).then(() => {
      log.info("Watchlist entry deleted successfully", { id });
    });
  }

  async getEntry(id: string): Promise<WatchlistEntry | null> {
    log.debug("Fetching watchlist entry", { id });

    return this.deps.globalRepo.findById(id).then((globalEntry) => {
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

  /**
   * System admin method to get ALL watchlist entries across the entire system
   * Returns both global entries and all organization-specific entries from every organization
   */
  async listAllSystemEntries(): Promise<WatchlistEntry[]> {
    log.debug("Listing all system watchlist entries (admin operation)");

    const globalEntriesPromise = this.deps.globalRepo.listBlockedEntries();
    const allOrgEntriesPromise = this.deps.orgRepo.listAllOrganizationEntries();

    const [globalEntries, allOrgEntries] = await Promise.all([globalEntriesPromise, allOrgEntriesPromise]);

    const combinedEntries = [...globalEntries, ...allOrgEntries];

    log.debug("All system watchlist entries retrieved", {
      globalCount: globalEntries.length,
      organizationCount: allOrgEntries.length,
      totalCount: combinedEntries.length,
    });
    return combinedEntries;
  }
}
