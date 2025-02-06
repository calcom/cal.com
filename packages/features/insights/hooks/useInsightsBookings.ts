import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { useMemo } from "react";

import { ColumnFilterType } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import type { RoutingFormTableRow } from "../lib/types";
import { useInsightsFacetedUniqueValues } from "./useInsightsFacetedUniqueValues";
import { useInsightsParameters } from "./useInsightsParameters";

type DummyTableRow = {
  bookingUserId: RoutingFormTableRow["bookingUserId"];
  eventTypeId: number | null;
};

const emptyData: DummyTableRow[] = [];

export const useInsightsBookings = () => {
  const { t } = useLocale();
  const { isAll, teamId, userId, routingFormId } = useInsightsParameters();

  const { data: headers, isSuccess: isHeadersSuccess } =
    trpc.viewer.insights.routingFormResponsesHeaders.useQuery({
      userId,
      teamId,
      isAll,
      routingFormId,
    });

  const getInsightsFacetedUniqueValues = useInsightsFacetedUniqueValues({ headers, userId, teamId, isAll });

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<DummyTableRow>();
    return [
      columnHelper.accessor("bookingUserId", {
        id: "bookingUserId",
        header: t("people"),
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
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues: getInsightsFacetedUniqueValues,
  });

  return { table };
};
