import { createColumnHelper, useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import { useMemo } from "react";

import { ColumnFilterType } from "@calcom/features/data-table";
import { useInsightsFacetedUniqueValues } from "@calcom/features/insights/hooks/useInsightsFacetedUniqueValues";
import { useInsightsOrgTeams } from "@calcom/features/insights/hooks/useInsightsOrgTeams";
import type { HeaderRow } from "@calcom/features/insights/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";

type WorkflowTableRow = {
  eventTypeId: number | null;
  workflowType: string | null;
};

const emptyData: WorkflowTableRow[] = [];
const dummyHeaders: HeaderRow[] = [];

export const useInsightsWorkflows = () => {
  const { t } = useLocale();
  const { isAll, teamId, userId } = useInsightsOrgTeams();

  const getInsightsFacetedUniqueValues = useInsightsFacetedUniqueValues({
    headers: dummyHeaders,
    userId,
    teamId,
    isAll,
  });

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<WorkflowTableRow>();
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
      columnHelper.accessor("workflowType", {
        id: "workflowType",
        header: t("workflow_type"),
        size: 3,
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

  const table = useReactTable<WorkflowTableRow>({
    data: emptyData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues: getInsightsFacetedUniqueValues,
  });

  return { table };
};
