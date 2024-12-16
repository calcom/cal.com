"use client";

import { useCallback, useEffect } from "react";

export const useFetchMoreOnBottomReached = ({
  tableContainerRef,
  hasNextPage,
  fetchNextPage,
  isFetching,
}: {
  tableContainerRef: React.RefObject<HTMLDivElement>;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetching: boolean;
}) => {
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        if (scrollHeight - scrollTop - clientHeight < 300 && !isFetching && hasNextPage) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching]
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached, tableContainerRef]);

  return fetchMoreOnBottomReached;
};
