import type { Table } from "@tanstack/react-table";
import { useCallback } from "react";

import { convertFacetedValuesToMap, type FacetedValue } from "@calcom/features/data-table";
import { trpc } from "@calcom/trpc/react";

export const useWrongAssignmentFacetedUniqueValues = ({
  userId,
  teamId,
  isAll,
}: {
  userId: number | undefined;
  teamId: number | undefined;
  isAll: boolean;
}) => {
  const { data: forms } = trpc.viewer.insights.getRoutingFormsForFilters.useQuery(
    {
      userId,
      teamId,
      isAll,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const { data: users } = trpc.viewer.insights.userList.useQuery(
    {
      teamId,
      isAll,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  return useCallback(
    <TData>(_: Table<TData>, columnId: string) =>
      (): Map<FacetedValue, number> => {
        if (columnId === "routingFormId") {
          return convertFacetedValuesToMap(
            forms?.map((form) => ({
              label: form.name,
              value: form.id,
            })) ?? []
          );
        } else if (columnId === "reportedById") {
          return convertFacetedValuesToMap(
            users
              ?.map((user) => ({
                label: user.name ?? user.email,
                value: user.id,
              }))
              .sort((a, b) => a.label.localeCompare(b.label)) ?? []
          );
        }
        return new Map<FacetedValue, number>();
      },
    [forms, users]
  );
};
