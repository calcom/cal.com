import { createColumnHelper, useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import { useMemo } from "react";

import { ColumnFilterType } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { HeaderRow, RoutingFormTableRow } from "../lib/types";
import { useInsightsFacetedUniqueValues } from "./useInsightsFacetedUniqueValues";
import { useInsightsParameters } from "./useInsightsParameters";

type DummyTableRow = {
  bookingUserId: RoutingFormTableRow["bookingUserId"];
  eventTypeId: number | null;
};

const emptyData: DummyTableRow[] = [];
const dummyHeaders: HeaderRow[] = [];

export const useInsightsBookings = () => {
  const { t } = useLocale();
  const { isAll, teamId, userId } = useInsightsParameters();

  const getInsightsFacetedUniqueValues = useInsightsFacetedUniqueValues({
    headers: dummyHeaders,
    userId,
    teamId,
    isAll,
  });

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<DummyTableRow>();
    return [
      columnHelper.accessor("bookingUserId", {
        id: "bookingUserId",
        header: t("user"),
        enableColumnFilter: true,
        enableSorting: false,
        meta: {
          filter: {
            type: ColumnFilterType.SINGLE_SELECT,
          },
        },
        cell: () => null,
      }),
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
