import { useMemo } from "react";

import { trpc } from "@calcom/trpc/react";

import type { Host, PendingHostChanges } from "./types";

const DEFAULT_PENDING_CHANGES: PendingHostChanges = {
  hostsToAdd: [],
  hostsToUpdate: [],
  hostsToRemove: [],
};

export type AvailabilityHostWithMeta = Host & {
  name: string | null;
  avatarUrl: string | null;
};

export function usePaginatedAvailabilityHosts({
  eventTypeId,
  pendingChanges,
  search,
  enabled = true,
}: {
  eventTypeId: number;
  pendingChanges: PendingHostChanges;
  search: string;
  enabled?: boolean;
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    trpc.viewer.eventTypes.getHostsForAvailability.useInfiniteQuery(
      { eventTypeId, limit: 20, search: search || undefined },
      {
        enabled: enabled && eventTypeId > 0,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const hosts = useMemo((): AvailabilityHostWithMeta[] => {
    const changes = pendingChanges ?? DEFAULT_PENDING_CHANGES;
    const serverHosts: AvailabilityHostWithMeta[] =
      data?.pages.flatMap((page) =>
        page.hosts.map((h) => ({
          userId: h.userId,
          isFixed: h.isFixed,
          priority: h.priority,
          weight: h.weight,
          scheduleId: h.scheduleId,
          groupId: h.groupId,
          name: h.name,
          avatarUrl: h.avatarUrl,
        }))
      ) ?? [];

    const removeSet = new Set(changes.hostsToRemove);
    const updateMap = new Map(changes.hostsToUpdate.map((u) => [u.userId, u]));

    // Filter out removed hosts and apply updates
    let result: AvailabilityHostWithMeta[] = serverHosts
      .filter((h) => !removeSet.has(h.userId))
      .map((h) => {
        const update = updateMap.get(h.userId);
        return update ? { ...h, ...update } : h;
      });

    // Prepend newly added hosts (they won't have name/avatar since they come from delta)
    if (changes.hostsToAdd.length > 0) {
      const added: AvailabilityHostWithMeta[] = changes.hostsToAdd.map((h) => ({
        ...h,
        name: null,
        avatarUrl: null,
      }));
      // Search filtering for newly added hosts is handled server-side for existing hosts.
      // Newly added hosts without name data won't match search and that's acceptable.
      result = [...added, ...result];
    }

    return result;
  }, [data, pendingChanges]);

  return { hosts, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading };
}
