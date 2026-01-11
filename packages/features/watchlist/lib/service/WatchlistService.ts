import type logger from "@calcom/lib/logger";
import { WatchlistType } from "@calcom/prisma/enums";

import type {
  IGlobalWatchlistRepository,
  IOrganizationWatchlistRepository,
} from "../interface/IWatchlistRepositories";
import type { IWatchlistService } from "../interface/IWatchlistService";
import type { WatchlistEntry, CreateWatchlistEntryData, UpdateWatchlistEntryData } from "../types";
import { normalizeEmail, normalizeDomain } from "../utils/normalization";

type Deps = {
  globalRepo: IGlobalWatchlistRepository;
  orgRepo: IOrganizationWatchlistRepository;
  logger: ReturnType<typeof logger.getSubLogger>;
};

export class WatchlistService implements IWatchlistService {
  private readonly log: ReturnType<typeof logger.getSubLogger>;

  constructor(private readonly deps: Deps) {
    this.log = deps.logger;
  }

  async createEntry(data: CreateWatchlistEntryData): Promise<WatchlistEntry> {
    const isGlobal = data.isGlobal ?? false;

    // Normalize value based on type (service layer responsibility)
    const normalizedValue =
      data.type === WatchlistType.EMAIL ? normalizeEmail(data.value) : normalizeDomain(data.value);

    const payload = {
      type: data.type,
      value: normalizedValue,
      description: data.description,
      action: data.action,
      source: data.source,
    };

    // Global path
    if (isGlobal) {
      return this.deps.globalRepo.createEntry(payload);
    }

    // Org path (validate, then narrow)
    const orgId = data.organizationId;
    if (orgId == null) {
      this.log.error("organizationId required for non-global entry", { type: data.type, value: data.value });
      throw new Error("organizationId is required for organization-scoped entries");
    }

    return this.deps.orgRepo.createEntry(orgId, payload);
  }

  async updateEntry(id: string, data: UpdateWatchlistEntryData): Promise<WatchlistEntry> {
    // Normalize value if provided (service layer responsibility)
    const payload = {
      ...data,
      ...(data.value && {
        value: data.type === WatchlistType.EMAIL ? normalizeEmail(data.value) : normalizeDomain(data.value),
      }),
    };

    return this.deps.globalRepo.updateEntry(id, payload);
  }

  async deleteEntry(id: string): Promise<void> {
    return this.deps.globalRepo.deleteEntry(id);
  }

  async getEntry(id: string): Promise<WatchlistEntry | null> {
    return this.deps.globalRepo.findById(id);
  }

  /**
   * System admin method to get ALL watchlist entries across the entire system
   * Returns both global entries and all organization-specific entries from every organization
   */
  async listAllSystemEntries(): Promise<WatchlistEntry[]> {
    const [globalEntries, allOrgEntries] = await Promise.all([
      this.deps.globalRepo.listBlockedEntries(),
      this.deps.orgRepo.listAllOrganizationEntries(),
    ]);

    return [...globalEntries, ...allOrgEntries];
  }
}
