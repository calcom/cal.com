import { useCallback, useMemo, useState } from "react";
import type { NativeSyntheticEvent } from "react-native";
import type { BookingFilters } from "./useBookings";

export type BookingFilter = "upcoming" | "unconfirmed" | "recurring" | "past" | "cancelled";

export interface BookingFilterOption {
  key: BookingFilter;
  label: string;
}

const FILTER_OPTIONS: BookingFilterOption[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "unconfirmed", label: "Unconfirmed" },
  { key: "recurring", label: "Recurring" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];

/**
 * Hook to manage active booking filter state and provide filter-related utilities.
 *
 * Features:
 * - Manages active filter state
 * - Provides filter options and labels for UI components
 * - Converts filter selection to API-compatible parameters
 * - Handles segmented control integration
 * - Supports change callbacks for dependent filter cleanup
 *
 * @param initialFilter - Initial filter value (defaults to "upcoming")
 * @param onFilterChange - Optional callback invoked when filter changes
 * @returns Object containing filter state, handlers, and computed values
 *
 * @example
 * ```tsx
 * const {
 *   activeFilter,
 *   filterLabels,
 *   activeIndex,
 *   filterParams,
 *   handleFilterChange,
 *   handleSegmentChange,
 * } = useActiveBookingFilter("upcoming", () => {
 *   // Clear dependent filters like search query, event type filter, etc.
 *   setSearchQuery("");
 *   setSelectedEventTypeId(null);
 * });
 *
 * // Use with React Query
 * const { data: bookings } = useBookings(filterParams);
 *
 * // Use with SegmentedControl
 * <SegmentedControl
 *   values={filterLabels}
 *   selectedIndex={activeIndex}
 *   onChange={handleSegmentChange}
 * />
 * ```
 */
export function useActiveBookingFilter(
  initialFilter: BookingFilter = "upcoming",
  onFilterChange?: (filter: BookingFilter) => void
) {
  const [activeFilter, setActiveFilter] = useState<BookingFilter>(initialFilter);

  /**
   * Converts the active filter to API-compatible query parameters
   */
  const filterParams = useMemo<BookingFilters>(() => {
    switch (activeFilter) {
      case "upcoming":
        return { status: ["upcoming"], limit: 50 };
      case "unconfirmed":
        return { status: ["unconfirmed"], limit: 50 };
      case "recurring":
        return { status: ["recurring"], limit: 100 };
      case "past":
        return { status: ["past"], limit: 100 };
      case "cancelled":
        return { status: ["cancelled"], limit: 100 };
      default:
        return { status: ["upcoming"], limit: 50 };
    }
  }, [activeFilter]);

  /**
   * Array of filter labels for UI components (e.g., SegmentedControl)
   */
  const filterLabels = useMemo(() => FILTER_OPTIONS.map((option) => option.label), []);

  /**
   * Current active filter index for UI components
   */
  const activeIndex = useMemo(
    () => FILTER_OPTIONS.findIndex((option) => option.key === activeFilter),
    [activeFilter]
  );

  /**
   * Changes the active filter and invokes the optional callback
   */
  const handleFilterChange = useCallback(
    (filter: BookingFilter) => {
      setActiveFilter(filter);
      onFilterChange?.(filter);
    },
    [onFilterChange]
  );

  /**
   * Handler for React Native SegmentedControl onChange event
   */
  const handleSegmentChange = useCallback(
    (event: NativeSyntheticEvent<{ selectedSegmentIndex: number }>) => {
      const { selectedSegmentIndex } = event.nativeEvent;
      const selectedFilter = FILTER_OPTIONS[selectedSegmentIndex];
      if (selectedFilter) {
        handleFilterChange(selectedFilter.key);
      }
    },
    [handleFilterChange]
  );

  return {
    // State
    activeFilter,

    // Computed values
    filterOptions: FILTER_OPTIONS,
    filterLabels,
    activeIndex,
    filterParams,

    // Handlers
    handleFilterChange,
    handleSegmentChange,
  };
}
