import type { Table } from "@tanstack/react-table";
import { useCallback } from "react";

import { convertFacetedValuesToMap, type FacetedValue } from "@calcom/features/data-table";
import { trpc } from "@calcom/trpc/react";

import { useEventTypes } from "./useEventTypes";

export function useFacetedUniqueValues() {
  const eventTypes = useEventTypes();
  const { data: calIdTeams } = trpc.viewer.calidTeams.list.useQuery();
  const { data: calIdMembers } = trpc.viewer.calidTeams.allTeamsListMembers.useQuery({
    limit: 500,
    paging: 0,
  });

  return useCallback(
    (_: Table<any>, columnId: string) => (): Map<FacetedValue, number> => {
      if (columnId === "eventTypeId") {
        return convertFacetedValuesToMap(eventTypes || []);
      } else if (columnId === "teamId") {
        return convertFacetedValuesToMap(
          (calIdTeams || [])
            .filter((team) => team.acceptedInvitation)
            .map((team) => ({
            label: team.name,
            value: team.id,
            }))
        );
      } else if (columnId === "userId") {
        const uniqueMembers = Array.from(
          new Map(
            (calIdMembers?.members || [])
              .filter((member) => member.acceptedInvitation)
              .map((member) => [member.user.id, member.user])
          ).values()
        );

        return convertFacetedValuesToMap(
          uniqueMembers
            .map((member) => ({
              label: member.name,
              value: member.id,
            }))
            .filter((option): option is { label: string; value: number } => Boolean(option.label))
        );
      }
      return new Map<FacetedValue, number>();
    },
    [eventTypes, calIdTeams, calIdMembers]
  );
}
