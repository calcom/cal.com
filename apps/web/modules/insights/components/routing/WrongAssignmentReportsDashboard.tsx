"use client";

import { ZSingleSelectFilterValue } from "@calcom/features/data-table";
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
import { showToast } from "@calcom/ui/components/toast";
import { RoutingFormResponseSheet } from "@calcom/web/components/booking/RoutingFormResponseSheet";
import { RoutingTraceSheet } from "@calcom/web/components/booking/RoutingTraceSheet";
import {
  DataTableFilters,
  DataTableSkeleton,
  DataTableWrapper,
} from "@calcom/web/modules/data-table/components";
import { useInsightsOrgTeams } from "@calcom/web/modules/insights/hooks/useInsightsOrgTeams";
import {
  useWrongAssignmentColumns,
  type WrongAssignmentReportRow,
} from "@calcom/web/modules/insights/hooks/useWrongAssignmentColumns";
import { useWrongAssignmentFacetedUniqueValues } from "@calcom/web/modules/insights/hooks/useWrongAssignmentFacetedUniqueValues";
import { createColumnHelper, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import { useDataTable } from "~/data-table/hooks/useDataTable";
import { useFilterValue } from "~/data-table/hooks/useFilterValue";
import { OrgTeamsFilter } from "../filters/OrgTeamsFilter";

type TabType = "pending" | "handled";

export function WrongAssignmentReportsDashboard() {
  const { t } = useLocale();
  const { teamId, userId, isAll } = useInsightsOrgTeams();
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [routingTraceBookingUid, setRoutingTraceBookingUid] = useState<string | null>(null);
  const [formResponseId, setFormResponseId] = useState<number | null>(null);

  const { sorting, limit, offset } = useDataTable();

  const routingFormId = useFilterValue("routingFormId", ZSingleSelectFilterValue)?.data as string | undefined;
  const reportedById = useFilterValue("reportedById", ZSingleSelectFilterValue)?.data as number | undefined;

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

  const handleStatusChange = useCallback(
    (reportId: string, newStatus: WrongAssignmentReportStatus) => {
      updateStatusMutation.mutate({ reportId, status: newStatus });
    },
    [updateStatusMutation]
  );

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
                        StartIcon="git-merge"
                        onClick={() => setRoutingTraceBookingUid(report.bookingUid)}>
                        {t("routing_trace")}
                      </DropdownItem>
                    </DropdownMenuItem>
                    {report.booking?.routedFromRoutingFormReponse?.id && (
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          StartIcon="file-text"
                          onClick={() =>
                            setFormResponseId(report.booking?.routedFromRoutingFormReponse?.id ?? null)
                          }>
                          {t("view_form_submission")}
                        </DropdownItem>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}
                {report.status !== WrongAssignmentReportStatus.PENDING && (
                  <DropdownMenuItem>
                    <DropdownItem
                      type="button"
                      StartIcon="rotate-ccw"
                      onClick={() => handleStatusChange(report.id, WrongAssignmentReportStatus.PENDING)}>
                      {t("reopen")}
                    </DropdownItem>
                  </DropdownMenuItem>
                )}
                {report.status !== WrongAssignmentReportStatus.REVIEWED && (
                  <DropdownMenuItem>
                    <DropdownItem
                      type="button"
                      StartIcon="check"
                      onClick={() => handleStatusChange(report.id, WrongAssignmentReportStatus.REVIEWED)}>
                      {t("mark_as_reviewed")}
                    </DropdownItem>
                  </DropdownMenuItem>
                )}
                {report.status !== WrongAssignmentReportStatus.RESOLVED && (
                  <DropdownMenuItem>
                    <DropdownItem
                      type="button"
                      StartIcon="check-check"
                      onClick={() => handleStatusChange(report.id, WrongAssignmentReportStatus.RESOLVED)}>
                      {t("mark_as_resolved")}
                    </DropdownItem>
                  </DropdownMenuItem>
                )}
                {report.status !== WrongAssignmentReportStatus.DISMISSED && (
                  <DropdownMenuItem>
                    <DropdownItem
                      type="button"
                      StartIcon="x"
                      onClick={() => handleStatusChange(report.id, WrongAssignmentReportStatus.DISMISSED)}>
                      {t("dismiss")}
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
              color={activeTab === "handled" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("handled")}>
              {t("handled")}
            </Button>
            <DataTableFilters.FilterBar table={table} />
          </>
        }
        ToolbarRight={<DataTableFilters.ClearFiltersButton />}
        EmptyView={
          <EmptyScreen
            headline={activeTab === "pending" ? t("no_pending_reports") : t("no_handled_reports")}
            description={
              activeTab === "pending"
                ? t("no_pending_reports_description")
                : t("no_handled_reports_description")
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
      {formResponseId && (
        <RoutingFormResponseSheet
          isOpen={!!formResponseId}
          setIsOpen={(open) => {
            if (!open) setFormResponseId(null);
          }}
          formResponseId={formResponseId}
        />
      )}
    </>
  );
}
