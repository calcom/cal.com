import { useMemo, useState, useCallback } from "react";

import { trpc } from "@calcom/trpc/react";

const HOSTS_PER_PAGE = 10;

export type EventTypeHost = {
  value: string;
  label: string;
  avatar: string;
  email: string;
  defaultScheduleId: number | null;
  id: number;
  name: string | null;
  username: string | null;
  membership: string;
  eventTypes: string[];
  profileId: number | undefined;
};

export function useEventTypeHosts(eventTypeId: number | undefined) {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = trpc.viewer.eventTypes.getEventTypeHosts.useInfiniteQuery(
    {
      eventTypeId: eventTypeId ?? 0,
      limit: HOSTS_PER_PAGE,
      searchQuery: searchQuery || undefined,
    },
    {
      enabled: !!eventTypeId,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      trpc: {
        context: {
          skipBatch: true,
        },
      },
    }
  );

  const hosts = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.hosts);
  }, [data?.pages]);

  const totalCount = data?.pages[0]?.totalCount ?? 0;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return {
    hosts,
    totalCount,
    isLoading,
    isError,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    loadMore,
    searchQuery,
    handleSearch,
  };
}
