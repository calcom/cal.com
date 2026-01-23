import { convertFacetedValuesToMap, type FacetedValue } from "@calcom/features/data-table";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { RowData, Table } from "@tanstack/react-table";
import { useCallback } from "react";

import { useEventTypes } from "./useEventTypes";

interface UseFacetedUniqueValuesOptions {
  canReadOthersBookings: boolean;
}

export function useFacetedUniqueValues({
  canReadOthersBookings,
}: UseFacetedUniqueValuesOptions): <TData extends RowData>(
  table: Table<TData>,
  columnId: string
) => () => Map<FacetedValue, number> {
  const eventTypes = useEventTypes();
  const { data: teams } = trpc.viewer.teams.list.useQuery();
  const { data: members } = trpc.viewer.teams.listSimpleMembers.useQuery(undefined, {
    enabled: canReadOthersBookings,
  });
  const { data: currentUser } = useMeQuery();

  return useCallback(
    <TData extends RowData>(_: Table<TData>, columnId: string) =>
      (): Map<FacetedValue, number> => {
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
          if (!canReadOthersBookings) {
            if (!currentUser) {
              return new Map<FacetedValue, number>();
            }
            return convertFacetedValuesToMap([
              {
                label: currentUser.name || currentUser.email,
                value: currentUser.id,
              },
            ]);
          }
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
    [eventTypes, teams, members, canReadOthersBookings, currentUser]
  );
}
