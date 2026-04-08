import type { Host, PendingHostChanges } from "./types";

/**
 * Applies pending delta changes on top of a baseline host array to produce the full merged array.
 *
 * Used by:
 * - `HostsFormSync` (hosts-store-provider.tsx) to keep the form's `hosts[]` field in sync
 * - `useAllHosts` hook (use-all-hosts.ts) to merge server hosts with pending changes for display
 *
 * Order of operations: remove → update (with clearAllHostLocations override) → add.
 */
export function applyPendingHostChanges(baselineHosts: Host[], pending: PendingHostChanges): Host[] {
  if (
    !pending.hostsToAdd.length &&
    !pending.hostsToUpdate.length &&
    !pending.hostsToRemove.length &&
    !pending.clearAllHosts &&
    !pending.clearAllHostLocations
  ) {
    return baselineHosts;
  }

  // clearAllHosts removes every baseline host — only hostsToAdd survive
  if (pending.clearAllHosts) {
    return [...pending.hostsToAdd];
  }

  const removeSet = new Set(pending.hostsToRemove);
  const updateMap = new Map(pending.hostsToUpdate.map((u) => [u.userId, u]));

  let hosts = baselineHosts.filter((h) => !removeSet.has(h.userId));

  hosts = hosts.map((h) => {
    const update = updateMap.get(h.userId);
    if (!update) {
      if (pending.clearAllHostLocations) {
        return { ...h, location: null };
      }
      return h;
    }
    return {
      ...h,
      ...(update.isFixed !== undefined && { isFixed: update.isFixed }),
      ...(update.priority !== undefined && { priority: update.priority }),
      ...(update.weight !== undefined && { weight: update.weight }),
      ...(update.scheduleId !== undefined && { scheduleId: update.scheduleId }),
      ...(update.groupId !== undefined && { groupId: update.groupId }),
      ...(update.location !== undefined && { location: update.location }),
      // clearAllHostLocations always wins — override any explicit location update
      ...(pending.clearAllHostLocations && { location: null }),
    };
  });

  for (const host of pending.hostsToAdd) {
    if (!hosts.some((h) => h.userId === host.userId)) {
      hosts.push(host);
    }
  }

  return hosts;
}
