import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMemo } from "react";

import { trpc } from "@calcom/trpc";

import type { RoutingFormTableRow } from "../lib/types";
import { useInsightsColumns } from "./useInsightsColumns";
import { useInsightsFacetedUniqueValues } from "./useInsightsFacetedUniqueValues";
import { useInsightsParameters } from "./useInsightsParameters";

type FakeTableRow = RoutingFormTableRow & {
  eventTypeId: number;
};

const emptyData: FakeTableRow[] = [];

export const useInsightsBookings = () => {
  const { isAll, teamId, userId, routingFormId } = useInsightsParameters();

  const { data: headers, isSuccess: isHeadersSuccess } =
    trpc.viewer.insights.routingFormResponsesHeaders.useQuery({
      userId,
      teamId,
      isAll,
      routingFormId,
    });

  const getInsightsFacetedUniqueValues = useInsightsFacetedUniqueValues({ headers, userId, teamId, isAll });

  const columns = useInsightsColumns({ allowMultiMembers: false, headers, isHeadersSuccess });

  const finalColumns = useMemo(() => {
    const columnHelper = createColumnHelper<FakeTableRow>();
    return [
      ...columns,
      columnHelper.accessor("eventTypeId", {
        id: "eventTypeId",
        header: "",
        size: 200,
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
      }),
    ] as ColumnDef<FakeTableRow>[];
  }, [columns]);

  const table = useReactTable<FakeTableRow>({
    data: emptyData,
    columns: finalColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues: getInsightsFacetedUniqueValues,
  });

  return { table };
};
