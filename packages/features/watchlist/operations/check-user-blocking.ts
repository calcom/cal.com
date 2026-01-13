import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import logger from "@calcom/lib/logger";

const log: ReturnType<typeof logger.getSubLogger> = logger.getSubLogger({
  prefix: ["watchlist", "check-user-blocking"],
});

/**
 * Minimal user shape required for blocking checks.
 * Users must have email and locked status.
 */
export interface BlockableUser {
  email: string;
  locked: boolean;
}

export interface BlockingInfo {
  isBlocked: boolean;
  reason?: "locked" | "watchlist";
}

export interface CheckUserBlockingResult {
  /** Map of normalized email -> blocking info */
  blockingMap: Map<string, BlockingInfo>;
  /** Count of blocked users */
  blockedCount: number;
  /** Count of locked users */
  lockedCount: number;
  /** Count of watchlist-blocked users */
  watchlistBlockedCount: number;
}

export async function checkWatchlistBlocking(
  emails: string[],
  organizationId?: number | null
): Promise<Map<string, boolean>> {
  try {
    const watchlist = await getWatchlistFeature();

    // Batch check - single DB query for all emails
    const globalBlockedMap = await watchlist.globalBlocking.areBlocked(emails);

    let orgBlockedMap: Map<string, { isBlocked: boolean }> | null = null;
    if (organizationId) {
      orgBlockedMap = await watchlist.orgBlocking.areBlocked(emails, organizationId);
    }

    const result = new Map<string, boolean>();
    for (const email of emails) {
      const normalizedEmail = email.trim().toLowerCase();
      const globalResult = globalBlockedMap.get(normalizedEmail);
      const orgResult = orgBlockedMap?.get(normalizedEmail);

      result.set(normalizedEmail, !!(globalResult?.isBlocked || orgResult?.isBlocked));
    }

    return result;
  } catch (error) {
    // Fail-open: If watchlist check fails, allow booking to proceed
    // This ensures availability even if watchlist service is down
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    log.error("Watchlist check failed, allowing users through (fail-open)", {
      error: errorMessage,
      emailCount: emails.length,
      organizationId,
    });
    return new Map(emails.map((e) => [e.trim().toLowerCase(), false]));
  }
}

/**
 * Core utility to check which users are blocked.
 * Checks both:
 * 1. Locked users (from user.locked field)
 * 2. Watchlist-blocked emails (global and org-level)
 *
 * Single DB query for N emails - eliminates N+1.
 *
 * @param users - List of users to check (must have email and locked fields)
 * @param organizationId - Optional organization ID for org-specific blocking
 * @returns Map of email -> blocking info and counts
 */
export async function getBlockedUsersMap<T extends BlockableUser>(
  users: T[],
  organizationId?: number | null
): Promise<CheckUserBlockingResult> {
  // Map to trim emails first, then filter out empty/invalid ones
  const validUsers = users
    .map((u) => ({ ...u, email: u.email?.trim() ?? "" }))
    .filter((u) => u.email.length > 0);

  if (validUsers.length === 0) {
    return { blockingMap: new Map(), blockedCount: 0, lockedCount: 0, watchlistBlockedCount: 0 };
  }

  const blockingMap = new Map<string, BlockingInfo>();
  let lockedCount = 0;

  // First pass: check locked users (immediate block, no DB needed)
  const nonLockedUsers: (typeof validUsers)[number][] = [];
  for (const user of validUsers) {
    const normalizedEmail = user.email.toLowerCase();

    if (user.locked) {
      blockingMap.set(normalizedEmail, { isBlocked: true, reason: "locked" });
      lockedCount++;
    } else {
      nonLockedUsers.push(user);
    }
  }

  // Second pass: check watchlist for non-locked users
  let watchlistBlockedCount = 0;
  if (nonLockedUsers.length > 0) {
    const emails = nonLockedUsers.map((u) => u.email);
    const watchlistResults = await checkWatchlistBlocking(emails, organizationId);

    for (const user of nonLockedUsers) {
      const normalizedEmail = user.email.trim().toLowerCase();
      const isWatchlistBlocked = watchlistResults.get(normalizedEmail) ?? false;

      if (isWatchlistBlocked) {
        blockingMap.set(normalizedEmail, { isBlocked: true, reason: "watchlist" });
        watchlistBlockedCount++;
      } else {
        blockingMap.set(normalizedEmail, { isBlocked: false });
      }
    }
  }

  return {
    blockingMap,
    blockedCount: lockedCount + watchlistBlockedCount,
    lockedCount,
    watchlistBlockedCount,
  };
}

/**
 * Check if a single user is blocked (convenience wrapper).
 */
export function isUserBlocked(email: string, blockingMap: Map<string, BlockingInfo>): boolean {
  if (!email || email.trim().length === 0) {
    return false; // Empty emails can't be blocked
  }
  return blockingMap.get(email.trim().toLowerCase())?.isBlocked ?? false;
}
