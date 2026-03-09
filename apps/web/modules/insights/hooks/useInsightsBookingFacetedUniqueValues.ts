import type { Table } from "@tanstack/react-table";
import { useCallback } from "react";

import { convertFacetedValuesToMap, type FacetedValue } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingStatus } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

import { bookingStatusToText } from "@calcom/features/insights/lib/bookingStatusToText";

const statusOrder: Record<BookingStatus, number> = {
  [BookingStatus.ACCEPTED]: 1,
  [BookingStatus.PENDING]: 2,
  [BookingStatus.AWAITING_HOST]: 3,
  [BookingStatus.CANCELLED]: 4,
  [BookingStatus.REJECTED]: 5,
};

export const useInsightsBookingFacetedUniqueValues = ({
  userId,
  teamId,
  isAll,
}: {
  userId: number | undefined;
  teamId: number | undefined;
  isAll: boolean;
}) => {
  const { t } = useLocale();
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
    (_: Table<any>, columnId: string) => (): Map<FacetedValue, number> => {
      if (columnId === "status") {
        return convertFacetedValuesToMap(
          Object.keys(statusOrder).map((status) => ({
            value: status.toLowerCase(),
            label: bookingStatusToText(status as BookingStatus),
          }))
        );
      } else if (columnId === "userId") {
        return convertFacetedValuesToMap(
          users?.map((user) => ({
            label: user.name ?? user.email,
            value: user.id,
          })) ?? []
        );
      } else if (columnId === "eventTypeId") {
        return convertFacetedValuesToMap(
          eventTypes?.map((eventType) => ({
            value: eventType.id,
            label: eventType.teamId ? `${eventType.title} (${eventType.team?.name})` : eventType.title,
          })) ?? []
        );
      } else if (columnId === "paid") {
        return convertFacetedValuesToMap([
          { value: "true", label: t("paid") },
          { value: "false", label: t("free") },
        ]);
      }
      return new Map<FacetedValue, number>();
    },
    [users, eventTypes, t]
  );
};
