import { useCallback, useMemo, useState } from "react";
import type { EventType } from "@/services/calcom";

// Sort options for event types
export type EventTypeSortOption = "alphabetical" | "newest" | "duration";

// Filter options (multi-select toggles)
// When ALL filters are OFF: show ALL event types (no filtering)
// When a filter is ON: only show events matching that filter
export interface EventTypeFilters {
  hiddenOnly: boolean; // When ON, show ONLY hidden events
  paidOnly: boolean; // When ON, show ONLY paid events
  seatedOnly: boolean; // When ON, show ONLY seated events
  requiresConfirmationOnly: boolean; // When ON, show ONLY events requiring confirmation
  recurringOnly: boolean; // When ON, show ONLY recurring events
}

const DEFAULT_FILTERS: EventTypeFilters = {
  hiddenOnly: false,
  paidOnly: false,
  seatedOnly: false,
  requiresConfirmationOnly: false,
  recurringOnly: false,
};

interface UseEventTypeFilterResult {
  // State
  sortBy: EventTypeSortOption;
  filters: EventTypeFilters;

  // Actions
  setSortBy: (sort: EventTypeSortOption) => void;
  toggleFilter: (filterKey: keyof EventTypeFilters) => void;
  resetFilters: () => void;

  // Computed
  filteredAndSortedEventTypes: (eventTypes: EventType[]) => EventType[];
  activeFilterCount: number;
}

/**
 * Helper function to sort event types by the given sort option.
 */
function sortEventTypes(eventTypes: EventType[], sortBy: EventTypeSortOption): EventType[] {
  return [...eventTypes].sort((a, b) => {
    switch (sortBy) {
      case "alphabetical":
        return a.title.localeCompare(b.title);
      case "newest":
        return b.id - a.id;
      case "duration": {
        const durationA = a.lengthInMinutes || a.length || 0;
        const durationB = b.lengthInMinutes || b.length || 0;
        return durationA - durationB;
      }
      default:
        return 0;
    }
  });
}

/**
 * Hook to manage event type filtering and sorting.
 *
 * Supports:
 * - Sorting: Alphabetical, Newest First, By Duration
 * - Filters (multi-select toggles):
 *   - Include Hidden: Show hidden event types
 *   - Paid Only: Show only paid events (price > 0)
 *   - Seated Only: Show only seated events
 *   - Requires Confirmation: Show only events requiring confirmation
 *   - Recurring Only: Show only recurring events
 */
export function useEventTypeFilter(): UseEventTypeFilterResult {
  const [sortBy, setSortBy] = useState<EventTypeSortOption>("alphabetical");
  const [filters, setFilters] = useState<EventTypeFilters>(DEFAULT_FILTERS);

  const toggleFilter = useCallback((filterKey: keyof EventTypeFilters) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey],
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.hiddenOnly) count++;
    if (filters.paidOnly) count++;
    if (filters.seatedOnly) count++;
    if (filters.requiresConfirmationOnly) count++;
    if (filters.recurringOnly) count++;
    return count;
  }, [filters]);

  const filteredAndSortedEventTypes = useCallback(
    (eventTypes: EventType[]): EventType[] => {
      if (!eventTypes || eventTypes.length === 0) {
        return [];
      }

      // Check if ANY filter is ON
      const hasAnyFilter =
        filters.hiddenOnly ||
        filters.paidOnly ||
        filters.seatedOnly ||
        filters.requiresConfirmationOnly ||
        filters.recurringOnly;

      // If NO filters are enabled, show ALL event types (no filtering)
      if (!hasAnyFilter) {
        return sortEventTypes(eventTypes, sortBy);
      }

      // Apply filters - each filter narrows down results (AND logic)
      const filtered = eventTypes.filter((eventType) => {
        // Hidden filter: when ON, show ONLY hidden events
        if (filters.hiddenOnly && eventType.hidden !== true) {
          return false;
        }

        // Paid filter: if enabled, only show paid events (price > 0)
        if (filters.paidOnly) {
          const isPaid =
            eventType.price !== undefined && eventType.price !== null && eventType.price > 0;
          if (!isPaid) {
            return false;
          }
        }

        // Seated filter: check if seats is defined and not disabled
        if (filters.seatedOnly) {
          const hasSeats =
            eventType.seats &&
            typeof eventType.seats === "object" &&
            !("disabled" in eventType.seats && eventType.seats.disabled === true);
          if (!hasSeats) {
            return false;
          }
        }

        // Requires confirmation filter - check both requiresConfirmation and confirmationPolicy
        if (filters.requiresConfirmationOnly) {
          const hasRequiresConfirmation = eventType.requiresConfirmation === true;
          const hasConfirmationPolicy =
            eventType.confirmationPolicy &&
            typeof eventType.confirmationPolicy === "object" &&
            !(
              "disabled" in eventType.confirmationPolicy &&
              eventType.confirmationPolicy.disabled === true
            );

          if (!hasRequiresConfirmation && !hasConfirmationPolicy) {
            return false;
          }
        }

        // Recurring filter: check if recurrence is defined and not disabled
        if (filters.recurringOnly) {
          const isRecurring =
            eventType.recurrence &&
            typeof eventType.recurrence === "object" &&
            !("disabled" in eventType.recurrence && eventType.recurrence.disabled === true);
          if (!isRecurring) {
            return false;
          }
        }

        return true;
      });

      // Apply sorting using helper function
      return sortEventTypes(filtered, sortBy);
    },
    [sortBy, filters]
  );

  return {
    sortBy,
    filters,
    setSortBy,
    toggleFilter,
    resetFilters,
    filteredAndSortedEventTypes,
    activeFilterCount,
  };
}
