import { useMemo } from "react";

import { trpc } from "@calcom/trpc/react";

import { recalculateDateRange } from "@calcom/features/data-table/lib/dateRange";
import { type UseSegments, SYSTEM_SEGMENT_PREFIX } from "@calcom/features/data-table/lib/types";
import { isDateRangeFilterValue } from "@calcom/features/data-table/lib/utils";

export const useSegments: UseSegments = ({ tableIdentifier, providedSegments, systemSegments }) => {
  const utils = trpc.useUtils();
  const { data: rawSegments, isSuccess } = trpc.viewer.filterSegments.list.useQuery(
    {
      tableIdentifier,
    },
    {
      enabled: !providedSegments, // Only fetch if segments are not provided
    }
  );
  const { mutate: setPreference } = trpc.viewer.filterSegments.setPreference.useMutation({
    async onMutate({ segmentId }) {
      // Cancel in-flight list refetches (e.g. from invalidate() after segment
      // creation) so they don't overwrite this optimistic update.
      await utils.viewer.filterSegments.list.cancel({ tableIdentifier });
      const previousData = utils.viewer.filterSegments.list.getData({ tableIdentifier });
      utils.viewer.filterSegments.list.setData({ tableIdentifier }, (prev) => {
        if (!prev) return prev;
        return { ...prev, preferredSegmentId: segmentId };
      });
      return { previousData };
    },
    onError(_err, _vars, context) {
      if (context?.previousData) {
        utils.viewer.filterSegments.list.setData({ tableIdentifier }, context.previousData);
      }
    },
    onSettled() {
      utils.viewer.filterSegments.list.invalidate({ tableIdentifier });
    },
  });

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
