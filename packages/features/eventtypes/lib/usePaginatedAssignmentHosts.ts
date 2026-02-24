import { keepPreviousData } from "@tanstack/react-query";
import { useMemo } from "react";

import { trpc } from "@calcom/trpc/react";

import type { Host, PendingHostChanges } from "./types";

const DEFAULT_PENDING_CHANGES: PendingHostChanges = {
  hostsToAdd: [],
  hostsToUpdate: [],
  hostsToRemove: [],
};

export type AssignmentHostWithMeta = Host & {
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

export function usePaginatedAssignmentHosts({
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
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching, isLoading } =
    trpc.viewer.eventTypes.getHostsForAssignment.useInfiniteQuery(
      { eventTypeId, limit: 20, search: search || undefined },
      {
        enabled: enabled && eventTypeId > 0,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
      }
    );

  // hasFixedHosts is only returned on the first page
  const serverHasFixedHosts = data?.pages[0]?.hasFixedHosts ?? false;

  const serverHosts = useMemo((): AssignmentHostWithMeta[] => {
    return data?.pages.flatMap((page) =>
      page.hosts.map((h) => ({
        userId: h.userId,
        isFixed: h.isFixed,
        priority: h.priority,
        weight: h.weight,
        scheduleId: h.scheduleId,
        groupId: h.groupId,
        name: h.name,
        email: h.email,
        avatarUrl: h.avatarUrl,
      }))
    ) ?? [];
  }, [data]);

  const hosts = useMemo((): AssignmentHostWithMeta[] => {
    const changes = pendingChanges ?? DEFAULT_PENDING_CHANGES;

    // When clearAllHosts is true, ignore server hosts and only show hostsToAdd
    if (changes.clearAllHosts) {
      return changes.hostsToAdd.map((h) => ({
        ...h,
        name: null,
        email: "",
        avatarUrl: null,
      }));
    }

    const removeSet = new Set(changes.hostsToRemove);
    const updateMap = new Map(changes.hostsToUpdate.map((u) => [u.userId, u]));

    // Filter out removed hosts and apply updates
    let result: AssignmentHostWithMeta[] = serverHosts
      .filter((h) => !removeSet.has(h.userId))
      .map((h) => {
        const update = updateMap.get(h.userId);
        return update ? { ...h, ...update } : h;
      });

    // Prepend newly added hosts
    if (changes.hostsToAdd.length > 0) {
      const added: AssignmentHostWithMeta[] = changes.hostsToAdd.map((h) => ({
        ...h,
        name: null,
        email: "",
        avatarUrl: null,
      }));
      result = [...added, ...result];
    }

    return result;
  }, [serverHosts, pendingChanges]);

  return { hosts, serverHosts, serverHasFixedHosts, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching, isLoading };
}
