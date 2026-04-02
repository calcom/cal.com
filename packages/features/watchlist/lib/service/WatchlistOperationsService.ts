import type { PrismaBookingReportRepository } from "@calcom/features/bookingReport/repositories/PrismaBookingReportRepository";
import type { WatchlistEntry } from "@calcom/features/watchlist/lib/repository/IWatchlistRepository";
import type { WatchlistRepository } from "@calcom/features/watchlist/lib/repository/WatchlistRepository";
import { domainRegex, emailRegex } from "@calcom/lib/emailSchema";
import { WatchlistAction, WatchlistType } from "@calcom/prisma/enums";
import { WatchlistErrors } from "../errors/WatchlistErrors";

export interface AddReportsToWatchlistResult {
  success: boolean;
  message: string;
  addedCount: number;
  skippedCount: number;
  results: Array<{ reportId: string; watchlistId: string }>;
}

export interface CreateWatchlistEntryInput {
  type: WatchlistType;
  value: string;
  description?: string;
  userId: number;
}

export interface CreateWatchlistEntryResult {
  success: boolean;
  entry: WatchlistEntry;
}

export interface DeleteWatchlistEntryInput {
  entryId: string;
  userId: number;
}

export interface DeleteWatchlistEntryResult {
  success: boolean;
  message: string;
}

export interface WatchlistOperationsScope {
  organizationId: number | null;
  isGlobal: boolean;
}

type Deps = {
  watchlistRepo: WatchlistRepository;
  bookingReportRepo: PrismaBookingReportRepository;
};

export abstract class WatchlistOperationsService {
  constructor(protected readonly deps: Deps) {}

  protected abstract getScope(): WatchlistOperationsScope;

  validateEmailOrDomain(type: WatchlistType, value: string): void {
    if (type === WatchlistType.EMAIL && !emailRegex.test(value)) {
      throw WatchlistErrors.invalidEmail("Invalid email address format");
    }

    if (type === WatchlistType.DOMAIN) {
      const domainToValidate = value.startsWith("*.") ? value.slice(2) : value;
      if (!domainRegex.test(domainToValidate)) {
        throw WatchlistErrors.invalidDomain("Invalid domain format (e.g., example.com or *.example.com)");
      }
    }
  }

  async createWatchlistEntry(input: CreateWatchlistEntryInput): Promise<CreateWatchlistEntryResult> {
    const scope = this.getScope();

    this.validateEmailOrDomain(input.type, input.value);

    const entry = await this.deps.watchlistRepo.createEntryIfNotExists({
      type: input.type,
      value: input.value.toLowerCase(),
      organizationId: scope.organizationId,
      action: WatchlistAction.BLOCK,
      description: input.description,
      userId: input.userId,
      isGlobal: scope.isGlobal,
    });

    return {
      success: true,
      entry,
    };
  }

  async deleteWatchlistEntry(input: DeleteWatchlistEntryInput): Promise<DeleteWatchlistEntryResult> {
    await this.deps.watchlistRepo.deleteEntry(input.entryId, input.userId);

    return {
      success: true,
      message: "Entry deleted successfully",
    };
  }
}
