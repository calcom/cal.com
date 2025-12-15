import { useMemo, useEffect } from "react";

import { trpc } from "@calcom/trpc/react";

import type { NavigationCapabilities } from "../store/bookingDetailsSheetStore";

interface UseListNavigationCapabilitiesProps {
  limit: number;
  offset: number;
  totalCount: number | undefined;
  setPageIndex: (index: number) => void;
  queryInput: Parameters<typeof trpc.viewer.bookings.get.useQuery>[0];
}

/**
 * List view navigation capabilities adapter.
 * Provides pagination-specific navigation logic for the booking details sheet.
 *
 * This hook:
 * - Calculates page boundaries based on limit/offset
 * - Prefetches the next page when available (using the same query params as parent)
 * - Provides methods to navigate between pages
 */
export function useListNavigationCapabilities({
  limit,
  offset,
  totalCount,
  setPageIndex,
  queryInput,
}: UseListNavigationCapabilitiesProps): NavigationCapabilities {
  const trpcUtils = trpc.useUtils();
  const currentPageIndex = limit > 0 ? offset / limit : 0;

  // Calculate if there are more pages
  const hasNextPage = useMemo(() => {
    if (!totalCount) return false;
    return offset + limit < totalCount;
  }, [offset, limit, totalCount]);

  const hasPreviousPage = offset > 0;

  // Build query params for next page by reusing parent's query input
  const nextPageParams = useMemo(
    () => ({
      ...queryInput,
      offset: (currentPageIndex + 1) * limit,
    }),
    [queryInput, currentPageIndex, limit]
  );

  // Prefetch next page when it exists
  useEffect(() => {
    if (hasNextPage) {
      trpcUtils.viewer.bookings.get.prefetch(nextPageParams);
    }
  }, [hasNextPage, nextPageParams, trpcUtils]);

  return useMemo(
    () => ({
      canNavigateToNextPeriod: () => hasNextPage,
      canNavigateToPreviousPeriod: () => hasPreviousPage,

      requestNextPeriod: () => {
        if (!hasNextPage) return;
        setPageIndex(currentPageIndex + 1);
      },

      requestPreviousPeriod: () => {
        if (!hasPreviousPage) return;
        setPageIndex(currentPageIndex - 1);
      },
    }),
    [hasNextPage, hasPreviousPage, currentPageIndex, setPageIndex]
  );
}
