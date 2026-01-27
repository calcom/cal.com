import type { Table } from "@tanstack/react-table";
import { useCallback } from "react";

import { convertFacetedValuesToMap, type FacetedValue } from "@calcom/features/data-table";
import { BookingStatus } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

import { bookingStatusToText } from "@calcom/features/insights/lib/bookingStatusToText";
import type { HeaderRow } from "@calcom/web/modules/insights/lib/types";

const statusOrder: Record<BookingStatus, number> = {
  [BookingStatus.ACCEPTED]: 1,
  [BookingStatus.PENDING]: 2,
  [BookingStatus.AWAITING_HOST]: 3,
  [BookingStatus.CANCELLED]: 4,
  [BookingStatus.REJECTED]: 5,
};

export const useInsightsRoutingFacetedUniqueValues = ({
  headers,
  userId,
  teamId,
  isAll,
}: {
  headers: HeaderRow[] | undefined;
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

  const { data: eventTypes } = trpc.viewer.insights.eventTypeList.useQuery(
    {
      teamId,
      userId,
      isAll,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  return useCallback(
    <TData>(_: Table<TData>, columnId: string) =>
      (): Map<FacetedValue, number> => {
        if (!headers) {
          return new Map<FacetedValue, number>();
        }

        const fieldHeader = headers.find((h) => h.id === columnId);
        if (fieldHeader?.options) {
          return convertFacetedValuesToMap(
            fieldHeader.options
              .filter((option): option is { id: string; label: string } => option.id !== null)
              .map((option) => ({
                label: option.label,
                value: option.id,
              }))
          );
        } else if (columnId === "bookingStatusOrder") {
          return convertFacetedValuesToMap(
            Object.keys(statusOrder).map((status) => ({
              value: statusOrder[status as BookingStatus],
              label: bookingStatusToText(status as BookingStatus),
            }))
          );
        } else if (columnId === "formId") {
          return convertFacetedValuesToMap(
            forms?.map((form) => ({
              label: form.name,
              value: form.id,
            })) ?? []
          );
        } else if (columnId === "bookingUserId") {
          return convertFacetedValuesToMap(
            users
              ?.map((user) => ({
                label: user.name ?? user.email,
                value: user.id,
              }))
              .sort((a, b) => a.label.localeCompare(b.label)) ?? []
          );
        } else if (columnId === "eventTypeId") {
          return convertFacetedValuesToMap(
            eventTypes?.map((eventType) => ({
              value: eventType.id,
              label: eventType.teamId ? `${eventType.title} (${eventType.team?.name})` : eventType.title,
            })) ?? []
          );
        }
        return new Map<FacetedValue, number>();
      },
    [headers, forms, users, eventTypes]
  );
};
