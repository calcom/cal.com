import type { Table } from "@tanstack/react-table";
import { useCallback } from "react";

import { convertFacetedValuesToMap, type FacetedValue } from "@calcom/features/data-table";

import { useEventTypes } from "./useEventTypes";

export function useFacetedUniqueValues() {
  const eventTypes = useEventTypes();

  return useCallback(
    (_: Table<any>, columnId: string) => (): Map<FacetedValue, number> => {
      if (columnId === "eventTypeId") {
        return convertFacetedValuesToMap(eventTypes || []);
      }
      return new Map<FacetedValue, number>();
    },
    [eventTypes]
  );
}
