"use client";

import { useCallback, useEffect } from "react";

export const useFetchMoreOnBottomReached = ({
  tableContainerRef,
  hasNextPage,
  fetchNextPage,
  isFetching,
  enabled = true,
}: {
  tableContainerRef: React.RefObject<HTMLDivElement>;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetching: boolean;
  enabled?: boolean;
}) => {
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (!enabled) return;
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        if (scrollHeight - scrollTop - clientHeight < 300 && !isFetching && hasNextPage) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, hasNextPage, enabled]
  );

  useEffect(() => {
    if (!enabled) return;
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached, tableContainerRef, enabled]);

  return fetchMoreOnBottomReached;
};
