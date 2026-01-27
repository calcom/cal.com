import { useMemo, useEffect, useRef } from "react";

import { ColumnFilterType, useDataTable } from "@calcom/features/data-table";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

/**
 * Custom hook to manage allowed filters for calendar view
 * - Users without permission to read others' bookings: no filters
 * - Users with permission to read others' bookings: userId filter with their own ID as default
 */
export function useCalendarAllowedFilters({ canReadOthersBookings }: { canReadOthersBookings: boolean }) {
  const { data: user } = useMeQuery();
  const { updateFilter, clearAll } = useDataTable();
  const allowedFilterIds = useMemo(() => (canReadOthersBookings ? ["userId"] : []), [canReadOthersBookings]);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!user || hasInitialized.current) return;

    hasInitialized.current = true;

    // Clear all filters first (in case coming from list view with different filters)
    clearAll();

    // Then set the appropriate filter for users with permission
    if (canReadOthersBookings) {
      updateFilter("userId", {
        type: ColumnFilterType.MULTI_SELECT,
        data: [user.id],
      });
    }
  }, [user, canReadOthersBookings, updateFilter, clearAll]);

  return allowedFilterIds;
}
