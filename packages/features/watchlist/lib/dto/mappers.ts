import type { User } from "@calcom/prisma/client";
import { WatchlistType } from "@calcom/prisma/enums";
import type { Watchlist } from "../types";
import { normalizeDomain, normalizeEmail, normalizeUsername } from "../utils/normalization";
import type { BlockingCheckResultDTO, WatchlistEntryDTO, WatchlistListResponseDTO } from "./types";

export function mapWatchlistToDTO(
  watchlist: Watchlist & {
    createdBy?: User | null;
    updatedBy?: User | null;
  }
): WatchlistEntryDTO {
  return {
    id: watchlist.id,
    type: watchlist.type,
    value: watchlist.value,
    description: watchlist.description,
    action: watchlist.action,
    source: watchlist.source,
    isGlobal: watchlist.isGlobal,
    lastUpdatedAt: watchlist.lastUpdatedAt.toISOString(),
    organizationId: watchlist.organizationId,
    createdBy: watchlist.createdBy
      ? {
          id: watchlist.createdBy.id,
          name: watchlist.createdBy.name,
          email: watchlist.createdBy.email,
          avatarUrl: watchlist.createdBy.avatarUrl,
        }
      : null,
    updatedBy: watchlist.updatedBy
      ? {
          id: watchlist.updatedBy.id,
          name: watchlist.updatedBy.name,
          email: watchlist.updatedBy.email,
          avatarUrl: watchlist.updatedBy.avatarUrl,
        }
      : null,
  };
}

export function mapWatchlistListToDTO(
  watchlists: Array<
    Watchlist & {
      createdBy?: User | null;
      updatedBy?: User | null;
    }
  >,
  pagination?: {
    total: number;
    page: number;
    limit: number;
  }
): WatchlistListResponseDTO {
  return {
    entries: watchlists.map(mapWatchlistToDTO),
    pagination: pagination
      ? {
          ...pagination,
          hasMore: pagination.page * pagination.limit < pagination.total,
        }
      : undefined,
  };
}

export function mapBlockingResultToDTO(result: {
  isBlocked: boolean;
  reason?: WatchlistType;
  watchlistEntry?: WatchlistEntryDTO | null;
}): BlockingCheckResultDTO {
  return {
    isBlocked: result.isBlocked,
    reason: result.reason,
    matchedEntry: result.watchlistEntry
      ? {
          id: result.watchlistEntry.id,
          type: result.watchlistEntry.type,
          value: result.watchlistEntry.value,
          action: result.watchlistEntry.action,
        }
      : undefined,
  };
}

export function sanitizeWatchlistEntryDTO(dto: WatchlistEntryDTO): WatchlistEntryDTO {
  return {
    ...dto,
    createdBy: dto.createdBy
      ? {
          id: dto.createdBy.id,
          name: dto.createdBy.name,
          email: "", // Hide email in public responses
          avatarUrl: dto.createdBy.avatarUrl,
        }
      : null,
    updatedBy: dto.updatedBy
      ? {
          id: dto.updatedBy.id,
          name: dto.updatedBy.name,
          email: "", // Hide email in public responses
          avatarUrl: dto.updatedBy.avatarUrl,
        }
      : null,
  };
}

export function sanitizeWatchlistValue(type: WatchlistType, value: string): string {
  switch (type) {
    case WatchlistType.EMAIL:
      return normalizeEmail(value);
    case WatchlistType.DOMAIN:
      return normalizeDomain(value);
    case WatchlistType.USERNAME:
      return normalizeUsername(value);
    default:
      return value.trim();
  }
}
