import { startSpan } from "@sentry/nextjs";

import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";

import type { WatchlistEntry } from "../lib/types";

/**
 * System admin controller to get ALL watchlist entries across the entire system
 * Returns both global entries and all organization-specific entries from every organization
 *
 * This should only be accessible to system administrators
 */
export async function listAllSystemEntriesController(): Promise<WatchlistEntry[]> {
  return await startSpan({ name: "listAllSystemEntries Controller" }, async () => {
    const watchlist = await getWatchlistFeature();
    return watchlist.watchlist.listAllSystemEntries();
  });
}
