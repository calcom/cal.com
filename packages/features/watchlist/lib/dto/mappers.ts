import type { User } from "@calcom/prisma/client";
import type { WatchlistType } from "@calcom/prisma/enums";

import type { Watchlist } from "../types";
import { normalizeEmail, normalizeDomain, normalizeUsername } from "../utils/normalization";
import type { WatchlistEntryDTO, WatchlistListResponseDTO, BlockingCheckResultDTO } from "./types";

/**
 * Maps a Watchlist domain model to a WatchlistEntryDTO
 */
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

/**
 * Maps an array of Watchlist entries to a paginated response DTO
 */
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

/**
 * Maps blocking check result to DTO
 */
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

/**
 * Sanitizes sensitive data from DTOs for public APIs
 */
export function sanitizeWatchlistEntryDTO(dto: WatchlistEntryDTO): WatchlistEntryDTO {
  // Remove sensitive user information for public APIs
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

/**
 * Validates and sanitizes watchlist value based on type
 */
export function sanitizeWatchlistValue(type: string, value: string): string {
  switch (type) {
    case "EMAIL":
      return normalizeEmail(value);
    case "DOMAIN":
      return normalizeDomain(value);
    case "USERNAME":
      return normalizeUsername(value);
    default:
      return value.trim();
  }
}
