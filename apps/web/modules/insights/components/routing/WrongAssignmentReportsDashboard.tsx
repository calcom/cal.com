"use client";

import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper } from "@tanstack/react-table";
import { useState, useMemo } from "react";

import { useDataTable, useFilterValue, ZSingleSelectFilterValue } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WrongAssignmentReportStatus } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import {
  DataTableWrapper,
  DataTableFilters,
  DataTableSkeleton,
} from "@calcom/web/modules/data-table/components";

import { RoutingTraceSheet } from "@calcom/web/components/booking/RoutingTraceSheet";
import { OrgTeamsFilter } from "../filters/OrgTeamsFilter";
import { useInsightsOrgTeams } from "@calcom/web/modules/insights/hooks/useInsightsOrgTeams";
import { useWrongAssignmentFacetedUniqueValues } from "@calcom/web/modules/insights/hooks/useWrongAssignmentFacetedUniqueValues";
import {
  useWrongAssignmentColumns,
  type WrongAssignmentReportRow,
} from "@calcom/web/modules/insights/hooks/useWrongAssignmentColumns";

type TabType = "pending" | "reviewed";

export function WrongAssignmentReportsDashboard() {
  const { t } = useLocale();
  const { teamId, userId, isAll } = useInsightsOrgTeams();
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [routingTraceBookingUid, setRoutingTraceBookingUid] = useState<string | null>(null);

  const { sorting, limit, offset } = useDataTable();

  const routingFormId = useFilterValue("routingFormId", ZSingleSelectFilterValue)?.data as
    | string
    | undefined;
  const reportedById = useFilterValue("reportedById", ZSingleSelectFilterValue)?.data as
    | number
    | undefined;

  const utils = trpc.useUtils();

  const { data, isPending } = trpc.viewer.bookings.getWrongAssignmentReports.useQuery(
    {
      teamId: teamId!,
      isAll,
      status: activeTab,
      routingFormId: routingFormId ?? null,
      reportedById: reportedById ?? null,
      limit,
      offset,
    },
    {
      enabled: !!teamId,
    }
  );

  const updateStatusMutation = trpc.viewer.bookings.updateWrongAssignmentReportStatus.useMutation({
    onSuccess: () => {
      showToast(t("status_updated_successfully"), "success");
      utils.viewer.bookings.getWrongAssignmentReports.invalidate();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleStatusChange = (reportId: string, newStatus: WrongAssignmentReportStatus) => {
    updateStatusMutation.mutate({ reportId, status: newStatus });
  };

  const getFacetedUniqueValues = useWrongAssignmentFacetedUniqueValues({
    userId,
    teamId,
    isAll,
  });

  const baseColumns = useWrongAssignmentColumns();

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<WrongAssignmentReportRow>();
    return [
      ...baseColumns,
      columnHelper.display({
        id: "actions",
        header: t("actions"),
        size: 80,
        cell: (info) => {
          const report = info.row.original;
          return (
            <Dropdown>
              <DropdownMenuTrigger asChild>
                <Button color="secondary" size="sm" StartIcon="ellipsis" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {report.bookingUid && (
                  <>
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        onClick={() => setRoutingTraceBookingUid(report.bookingUid)}>
                        <Icon name="git-merge" className="mr-2 h-4 w-4" />
                        {t("routing_trace")}
                      </DropdownItem>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {report.status === WrongAssignmentReportStatus.PENDING && (
                  <>
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        onClick={() =>
                          handleStatusChange(report.id, WrongAssignmentReportStatus.REVIEWED)
                        }>
                        <Icon name="check" className="mr-2 h-4 w-4" />
                        {t("mark_as_reviewed")}
                      </DropdownItem>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        onClick={() =>
                          handleStatusChange(report.id, WrongAssignmentReportStatus.RESOLVED)
                        }>
                        <Icon name="check-check" className="mr-2 h-4 w-4" />
                        {t("mark_as_resolved")}
                      </DropdownItem>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        onClick={() =>
                          handleStatusChange(report.id, WrongAssignmentReportStatus.DISMISSED)
                        }>
                        <Icon name="x" className="mr-2 h-4 w-4" />
                        {t("dismiss")}
                      </DropdownItem>
                    </DropdownMenuItem>
                  </>
                )}
                {report.status !== WrongAssignmentReportStatus.PENDING && (
                  <DropdownMenuItem>
                    <DropdownItem
                      type="button"
                      onClick={() =>
                        handleStatusChange(report.id, WrongAssignmentReportStatus.PENDING)
                      }>
                      <Icon name="rotate-ccw" className="mr-2 h-4 w-4" />
                      {t("reopen")}
                    </DropdownItem>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </Dropdown>
          );
        },
      }),
    ];
  }, [baseColumns, t, handleStatusChange]);

  const processedData = useMemo(() => {
    return (data?.reports ?? []) as WrongAssignmentReportRow[];
  }, [data]);

  const table = useReactTable<WrongAssignmentReportRow>({
    data: processedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    defaultColumn: {
      size: 150,
    },
    initialState: {
      columnVisibility: {
        routingFormId: false,
        reportedById: false,
      },
    },
    getFacetedUniqueValues: getFacetedUniqueValues,
  });

  if (!teamId) {
    return (
      <EmptyScreen
        headline={t("wrong_assignment_reports")}
        description={t("select_team_to_view_reports")}
        Icon="users"
      />
    );
  }

  return (
    <>
      <DataTableWrapper<WrongAssignmentReportRow>
        table={table}
        isPending={isPending}
        rowClassName="min-h-14"
        paginationMode="standard"
        totalRowCount={data?.totalCount}
        LoaderView={<DataTableSkeleton columns={6} columnWidths={[220, 150, 150, 150, 100, 80]} />}
        ToolbarLeft={
          <>
            <OrgTeamsFilter />
            <Button
              color={activeTab === "pending" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("pending")}>
              {t("pending")}
            </Button>
            <Button
              color={activeTab === "reviewed" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("reviewed")}>
              {t("reviewed")}
            </Button>
            <DataTableFilters.FilterBar table={table} />
          </>
        }
        ToolbarRight={<DataTableFilters.ClearFiltersButton />}
        EmptyView={
          <EmptyScreen
            headline={activeTab === "pending" ? t("no_pending_reports") : t("no_reviewed_reports")}
            description={
              activeTab === "pending"
                ? t("no_pending_reports_description")
                : t("no_reviewed_reports_description")
            }
            Icon="file-text"
            className="bg-muted mb-16"
            iconWrapperClassName="bg-default"
            dashedBorder={false}
          />
        }
      />
      {routingTraceBookingUid && (
        <RoutingTraceSheet
          isOpen={!!routingTraceBookingUid}
          setIsOpen={(open) => {
            if (!open) setRoutingTraceBookingUid(null);
          }}
          bookingUid={routingTraceBookingUid}
        />
      )}
    </>
  );
}
