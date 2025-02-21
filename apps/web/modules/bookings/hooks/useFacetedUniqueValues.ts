import type { Table } from "@tanstack/react-table";
import { useCallback } from "react";

import { convertFacetedValuesToMap, type FacetedValue } from "@calcom/features/data-table";
import { trpc } from "@calcom/trpc/react";

import { useEventTypes } from "./useEventTypes";

export function useFacetedUniqueValues() {
  const eventTypes = useEventTypes();
  const { data: teams } = trpc.viewer.teams.list.useQuery();

  return useCallback(
    (_: Table<any>, columnId: string) => (): Map<FacetedValue, number> => {
      if (columnId === "eventTypeId") {
        return convertFacetedValuesToMap(eventTypes || []);
      } else if (columnId === "teamId") {
        return convertFacetedValuesToMap(
          (teams || []).map((team) => ({
            label: team.name,
            value: team.id,
          }))
        );
      }
      return new Map<FacetedValue, number>();
    },
    [eventTypes, teams]
  );
}
