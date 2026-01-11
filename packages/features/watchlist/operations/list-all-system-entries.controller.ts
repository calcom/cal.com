import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";

import type { SpanFn } from "../lib/telemetry";
import type { WatchlistEntry } from "../lib/types";

interface ListAllSystemEntriesParams {
  span?: SpanFn;
}

/**
 * System admin controller to get ALL watchlist entries across the entire system
 * Returns both global entries and all organization-specific entries from every organization
 *
 * This should only be accessible to system administrators
 */
export async function listAllSystemEntriesController(
  params: ListAllSystemEntriesParams = {}
): Promise<WatchlistEntry[]> {
  const { span } = params;

  const execute = async () => {
    const watchlist = await getWatchlistFeature();
    return watchlist.watchlist.listAllSystemEntries();
  };

  if (!span) {
    return execute();
  }

  return span({ name: "listAllSystemEntries Controller" }, execute);
}
