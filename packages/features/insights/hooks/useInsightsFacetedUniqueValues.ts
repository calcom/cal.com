import type { Table } from "@tanstack/react-table";
import { useCallback } from "react";

import { BookingStatus } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";

import { bookingStatusToText } from "../lib/bookingStatusToText";
import type { HeaderRow } from "../lib/types";

const statusOrder: Record<BookingStatus, number> = {
  [BookingStatus.ACCEPTED]: 1,
  [BookingStatus.PENDING]: 2,
  [BookingStatus.AWAITING_HOST]: 3,
  [BookingStatus.CANCELLED]: 4,
  [BookingStatus.REJECTED]: 5,
};

export const useInsightsFacetedUniqueValues = ({
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
  const { data: forms } = trpc.viewer.insights.getRoutingFormsForFilters.useQuery({
    userId,
    teamId,
    isAll,
  });

  const { data: users } = trpc.viewer.insights.userList.useQuery({
    teamId,
    isAll,
  });

  const { data: eventTypes } = trpc.viewer.insights.eventTypeList.useQuery({
    teamId,
    userId,
    isAll,
  });

  return useCallback(
    (_: Table<any>, columnId: string) => () => {
      if (!headers) {
        return new Map();
      }

      const fromArrayToMap = (array: { label: string; value: string | number }[]) => {
        return new Map(array.map((option) => [{ label: option.label, value: option.value }, 1]));
      };

      const fieldHeader = headers.find((h) => h.id === columnId);
      if (fieldHeader?.options) {
        return fromArrayToMap(
          fieldHeader.options
            .filter((option): option is { id: string; label: string } => option.id !== null)
            .map((option) => ({
              label: option.label,
              value: option.id,
            }))
        );
      } else if (columnId === "bookingStatusOrder") {
        return fromArrayToMap(
          Object.keys(statusOrder).map((status) => ({
            value: statusOrder[status as BookingStatus],
            label: bookingStatusToText(status as BookingStatus),
          }))
        );
      } else if (columnId === "formId") {
        return fromArrayToMap(
          forms?.map((form) => ({
            label: form.name,
            value: form.id,
          })) ?? []
        );
      } else if (columnId === "bookingUserId") {
        return fromArrayToMap(
          users?.map((user) => ({
            label: user.name ?? user.email,
            value: user.id,
          })) ?? []
        );
      } else if (columnId === "eventTypeId") {
        return fromArrayToMap(
          eventTypes?.map((eventType) => ({
            value: eventType.id,
            label: eventType.teamId ? `${eventType.title} (${eventType.team?.name})` : eventType.title,
          })) ?? []
        );
      }
      return new Map();
    },
    [headers, forms, users]
  );
};
