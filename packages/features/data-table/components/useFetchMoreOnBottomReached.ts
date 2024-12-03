"use client";

import { useCallback, useEffect } from "react";

export const useFetchMoreOnBottomReached = (
  tableContainerRef: React.RefObject<HTMLDivElement>,
  fetchNextPage: () => void,
  isFetching: boolean,
  totalFetched: number,
  totalDBRowCount: number
) => {
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        if (scrollHeight - scrollTop - clientHeight < 300 && !isFetching && totalFetched < totalDBRowCount) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalDBRowCount]
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached, tableContainerRef]);

  return fetchMoreOnBottomReached;
};
