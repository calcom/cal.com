import { createColumnHelper, useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import { useMemo } from "react";

import { ColumnFilterType } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { BookingStatus } from "@calcom/prisma/enums";

import { useInsightsBookingFacetedUniqueValues } from "./useInsightsBookingFacetedUniqueValues";
import { useInsightsOrgTeams } from "./useInsightsOrgTeams";

type DummyTableRow = {
  userId: number | null;
  eventTypeId: number | null;
  status: BookingStatus;
};

const emptyData: DummyTableRow[] = [];

export const useInsightsBookings = () => {
  const { t } = useLocale();
  const { isAll, teamId, userId } = useInsightsOrgTeams();

  const getInsightsFacetedUniqueValues = useInsightsBookingFacetedUniqueValues({
    userId,
    teamId,
    isAll,
  });

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<DummyTableRow>();
    return [
      columnHelper.accessor("eventTypeId", {
        id: "eventTypeId",
        header: t("event_type"),
        size: 200,
        meta: {
          filter: {
            type: ColumnFilterType.SINGLE_SELECT,
          },
        },
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: t("booking_status"),
        size: 200,
        meta: {
          filter: {
            type: ColumnFilterType.MULTI_SELECT,
          },
        },
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
      }),
      columnHelper.accessor("userId", {
        id: "userId",
        header: t("member"),
        enableColumnFilter: true,
        enableSorting: false,
        meta: {
          filter: {
            type: ColumnFilterType.SINGLE_SELECT,
          },
        },
        cell: () => null,
      }),
    ];
  }, [t]);

  const table = useReactTable<DummyTableRow>({
    data: emptyData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues: getInsightsFacetedUniqueValues,
  });

  return { table };
};
