import { useMemo, useEffect } from "react";

/**
 * Custom hook to manage allowed filters for calendar view
 * - Auto-selects first allowed filter when no filters are active
 * - Removes disallowed filters when transitioning from list view
 */
export function useCalendarAllowedFilters({
  canReadOthersBookings,
  activeFilters,
  setActiveFilters,
}: {
  canReadOthersBookings: boolean;
  activeFilters: Array<{ f: string }>;
  setActiveFilters: (filters: Array<{ f: string }>) => void;
}) {
  const allowedFilterIds = useMemo(() => (canReadOthersBookings ? ["userId"] : []), [canReadOthersBookings]);

  useEffect(() => {
    // Auto-select first allowed filter when no filters are active and filters are available
    // Actually this is to show "Member" filter automatically for owner / admin users,
    // because we only support that filter on the calendar view.
    if (activeFilters.length === 0 && allowedFilterIds.length > 0) {
      setActiveFilters([{ f: allowedFilterIds[0] }]);
      return;
    }

    // Clear all the non-allowed filters (in case coming from list view)
    const filteredActiveFilters = activeFilters.filter((filter) => allowedFilterIds.includes(filter.f));
    const hasDisallowedFilters = filteredActiveFilters.length !== activeFilters.length;

    if (hasDisallowedFilters) {
      setActiveFilters(filteredActiveFilters);
    }
  }, [allowedFilterIds, activeFilters, setActiveFilters]);

  return allowedFilterIds;
}
