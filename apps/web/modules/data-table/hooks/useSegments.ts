import { useMemo } from "react";

import { trpc } from "@calcom/trpc/react";

import { recalculateDateRange } from "../lib/dateRange";
import { type UseSegments, SYSTEM_SEGMENT_PREFIX } from "../lib/types";
import { isDateRangeFilterValue } from "../lib/utils";

export const useSegments: UseSegments = ({ tableIdentifier, providedSegments, systemSegments }) => {
  const { data: rawSegments, isSuccess } = trpc.viewer.filterSegments.list.useQuery(
    {
      tableIdentifier,
    },
    {
      enabled: !providedSegments, // Only fetch if segments are not provided
    }
  );
  const { mutate: setPreference } = trpc.viewer.filterSegments.setPreference.useMutation();

  const preferredSegmentId = useMemo(() => rawSegments?.preferredSegmentId || null, [rawSegments]);

  const segments = useMemo(() => {
    const userSegments = providedSegments || rawSegments?.segments || [];

    const processedSystemSegments = (systemSegments || []).map((segment) => ({
      perPage: 10,
      tableIdentifier,
      ...segment,
      id: `${SYSTEM_SEGMENT_PREFIX}${segment.id}`,
      type: "system" as const,
      activeFilters: segment.activeFilters.map((filter) => {
        if (isDateRangeFilterValue(filter.v)) {
          return {
            ...filter,
            v: recalculateDateRange(filter.v),
          };
        }
        return filter;
      }),
    }));

    const processedUserSegments = userSegments.map((segment) => ({
      ...segment,
      type: "user" as const,
      activeFilters: segment.activeFilters.map((filter) => {
        if (isDateRangeFilterValue(filter.v)) {
          return {
            ...filter,
            v: recalculateDateRange(filter.v),
          };
        }
        return filter;
      }),
    }));

    return [...processedSystemSegments, ...processedUserSegments];
  }, [rawSegments, providedSegments, systemSegments, tableIdentifier]);

  return {
    segments,
    preferredSegmentId,
    isSuccess: Boolean(providedSegments) || isSuccess,
    setPreference,
    isSegmentEnabled: true,
  };
};
