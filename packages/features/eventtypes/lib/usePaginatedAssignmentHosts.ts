import { useMemo } from "react";

import type { GetHostsForAssignmentResponse } from "@calcom/trpc/server/routers/viewer/eventTypes/getHostsForAssignment.handler";
import { trpc } from "@calcom/trpc/react";

import type { Host, PendingHostChanges } from "./types";

const DEFAULT_PENDING_CHANGES: PendingHostChanges = {
  hostsToAdd: [],
  hostsToUpdate: [],
  hostsToRemove: [],
};

export type AssignmentHostWithMeta = Host & {
  name: string | null;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trpcAny = trpc as any;
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    trpcAny.viewer.eventTypes.getHostsForAssignment.useInfiniteQuery(
      { eventTypeId, limit: 20, search: search || undefined },
      {
        enabled: enabled && eventTypeId > 0,
        getNextPageParam: (lastPage: GetHostsForAssignmentResponse) => lastPage.nextCursor,
      }
    ) as {
      data: { pages: GetHostsForAssignmentResponse[] } | undefined;
      fetchNextPage: () => void;
      hasNextPage: boolean | undefined;
      isFetchingNextPage: boolean;
      isLoading: boolean;
    };

  const serverHosts = useMemo((): AssignmentHostWithMeta[] => {
    return data?.pages.flatMap((page: GetHostsForAssignmentResponse) =>
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
  }, [data]);

  const hosts = useMemo((): AssignmentHostWithMeta[] => {
    const changes = pendingChanges ?? DEFAULT_PENDING_CHANGES;

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
        avatarUrl: null,
      }));
      result = [...added, ...result];
    }

    return result;
  }, [serverHosts, pendingChanges]);

  return { hosts, serverHosts, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading };
}
