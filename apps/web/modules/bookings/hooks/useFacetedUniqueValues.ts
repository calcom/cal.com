import type { Table } from "@tanstack/react-table";
import { useCallback } from "react";

import { convertFacetedValuesToMap, type FacetedValue } from "@calcom/features/data-table";
import { trpc } from "@calcom/trpc/react";

import { useEventTypes } from "./useEventTypes";

export function useFacetedUniqueValues() {
  const eventTypes = useEventTypes();
  const { data: teams } = trpc.viewer.teams.list.useQuery();
  const { data: members } = trpc.viewer.teams.listSimpleMembers.useQuery();

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
      } else if (columnId === "userId") {
        return convertFacetedValuesToMap(
          (members || [])
            .map((member) => ({
              label: member.name,
              value: member.id,
            }))
            .filter((option): option is { label: string; value: number } => Boolean(option.label))
        );
      }
      return new Map<FacetedValue, number>();
    },
    [eventTypes, teams, members]
  );
}
