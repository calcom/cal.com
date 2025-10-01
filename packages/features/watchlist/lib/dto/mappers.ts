import type { BlockedBooking, Watchlist } from "@calcom/lib/di/watchlist/types";
import type { User } from "@calcom/prisma/client";

import type {
  WatchlistEntryDTO,
  BlockedBookingLogDTO,
  WatchlistListResponseDTO,
  BlockingStatsDTO,
  BlockedBookingLogsResponseDTO,
  BlockingCheckResultDTO,
} from "./types";

/**
 * Maps a Watchlist domain model to a WatchlistEntryDTO
 */
export function mapWatchlistToDTO(
  watchlist: Watchlist & {
    createdBy: User;
    updatedBy?: User | null;
  }
): WatchlistEntryDTO {
  return {
    id: watchlist.id,
    type: watchlist.type,
    value: watchlist.value,
    description: watchlist.description,
    action: watchlist.action,
    severity: watchlist.severity,
    createdAt: watchlist.createdAt.toISOString(),
    updatedAt: watchlist.updatedAt.toISOString(),
    organizationId: watchlist.organizationId,
    createdBy: {
      id: watchlist.createdBy.id,
      name: watchlist.createdBy.name,
      email: watchlist.createdBy.email,
      avatarUrl: watchlist.createdBy.avatarUrl,
    },
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
 * Maps a BlockedBooking domain model to a BlockedBookingLogDTO
 */
export function mapBlockedBookingToDTO(
  blockedBooking: BlockedBooking & {
    watchlistEntry?: Watchlist | null;
  }
): BlockedBookingLogDTO {
  return {
    id: blockedBooking.id,
    email: blockedBooking.email,
    eventTypeId: blockedBooking.eventTypeId,
    organizationId: blockedBooking.organizationId,
    createdAt: blockedBooking.createdAt.toISOString(),
    watchlistId: blockedBooking.watchlistId,
    bookingData: blockedBooking.bookingData as Record<string, unknown> | null,
    watchlistEntry: blockedBooking.watchlistEntry
      ? {
          id: blockedBooking.watchlistEntry.id,
          type: blockedBooking.watchlistEntry.type,
          value: blockedBooking.watchlistEntry.value,
          action: blockedBooking.watchlistEntry.action,
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
      createdBy: User;
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
 * Maps blocking statistics to DTO
 */
export function mapBlockingStatsToDTO(
  stats: {
    totalBlocked: number;
    blockedByEmail: number;
    blockedByDomain: number;
  },
  organizationId: number,
  periodStart?: Date,
  periodEnd?: Date
): BlockingStatsDTO {
  return {
    totalBlocked: stats.totalBlocked,
    blockedByEmail: stats.blockedByEmail,
    blockedByDomain: stats.blockedByDomain,
    organizationId,
    periodStart: periodStart?.toISOString(),
    periodEnd: periodEnd?.toISOString(),
  };
}

/**
 * Maps blocked booking logs to paginated response DTO
 */
export function mapBlockedBookingLogsToDTO(
  logs: Array<
    BlockedBooking & {
      watchlistEntry?: Watchlist | null;
    }
  >,
  pagination?: {
    total: number;
    page: number;
    limit: number;
  }
): BlockedBookingLogsResponseDTO {
  return {
    logs: logs.map(mapBlockedBookingToDTO),
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
  reason?: "email" | "domain";
  watchlistEntry?: Watchlist | null;
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
    createdBy: {
      id: dto.createdBy.id,
      name: dto.createdBy.name,
      email: "", // Hide email in public responses
      avatarUrl: dto.createdBy.avatarUrl,
    },
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
      return value.toLowerCase().trim();
    case "DOMAIN":
      // Ensure domain starts with @ and is lowercase
      const domain = value.toLowerCase().trim();
      return domain.startsWith("@") ? domain : `@${domain}`;
    case "USERNAME":
      return value.toLowerCase().trim();
    default:
      return value.trim();
  }
}
