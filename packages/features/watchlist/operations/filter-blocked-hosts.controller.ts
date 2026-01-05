import { getWatchlistFeature } from "@calcom/features/di/watchlist/containers/watchlist";
import { normalizeEmail } from "@calcom/features/watchlist/lib/utils/normalization";

/**
 * Host type expected from slots service.
 * Minimal shape needed for filtering.
 */
export interface HostWithEmail {
  user: {
    id: number;
    email: string;
  };
}

/**
 * Filter out blocked hosts from a list using batched watchlist check.
 * Single DB query for N hosts - eliminates N+1.
 *
 * @param hosts - List of hosts to filter
 * @param organizationId - Optional organization ID for org-specific blocking
 * @returns Non-blocked hosts
 */
export async function filterBlockedHosts<T extends HostWithEmail>(
  hosts: T[],
  organizationId?: number | null
): Promise<T[]> {
  if (hosts.length === 0) {
    return [];
  }

  const watchlist = await getWatchlistFeature();
  const emails = hosts.map((h) => h.user.email);

  // Batch check - single DB query for all hosts
  const globalBlockedMap = await watchlist.globalBlocking.areBlocked(emails);

  let orgBlockedMap: Map<string, { isBlocked: boolean }> | null = null;
  if (organizationId) {
    orgBlockedMap = await watchlist.orgBlocking.areBlocked(emails, organizationId);
  }

  return hosts.filter((host) => {
    const email = normalizeEmail(host.user.email);
    const globalResult = globalBlockedMap.get(email);
    if (globalResult?.isBlocked) {
      return false;
    }

    if (orgBlockedMap) {
      const orgResult = orgBlockedMap.get(email);
      if (orgResult?.isBlocked) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Check if any hosts are blocked (for logging/metrics).
 * Uses batched check internally.
 */
export async function getBlockedHostCount<T extends HostWithEmail>(
  hosts: T[],
  organizationId?: number | null
): Promise<number> {
  const eligibleHosts = await filterBlockedHosts(hosts, organizationId);
  return hosts.length - eligibleHosts.length;
}
