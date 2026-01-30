"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WrongAssignmentReportStatus } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { Skeleton } from "@calcom/ui/components/skeleton";
import { useInsightsOrgTeams } from "@calcom/web/modules/insights/hooks/useInsightsOrgTeams";

type TabType = "pending" | "reviewed";

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: WrongAssignmentReportStatus }) {
  const { t } = useLocale();

  const statusConfig: Record<WrongAssignmentReportStatus, { variant: "default" | "success" | "warning" | "gray"; label: string }> = {
    [WrongAssignmentReportStatus.PENDING]: { variant: "warning", label: t("pending") },
    [WrongAssignmentReportStatus.REVIEWED]: { variant: "default", label: t("reviewed") },
    [WrongAssignmentReportStatus.RESOLVED]: { variant: "success", label: t("resolved") },
    [WrongAssignmentReportStatus.DISMISSED]: { variant: "gray", label: t("dismissed") },
  };

  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function WrongAssignmentReportsDashboard() {
  const { t } = useLocale();
  const { teamId } = useInsightsOrgTeams();
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const utils = trpc.useUtils();

  const { data, isPending, isError } = trpc.viewer.bookings.getWrongAssignmentReports.useQuery(
    {
      teamId: teamId!,
      status: activeTab,
      limit: pageSize,
      offset: page * pageSize,
    },
    {
      enabled: !!teamId,
    }
  );

  if (!teamId) {
    return (
      <div className="bg-default border-subtle rounded-lg border p-4">
        <EmptyScreen
          headline={t("wrong_assignment_reports")}
          description={t("select_team_to_view_reports")}
          Icon="users"
        />
      </div>
    );
  }

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

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(0);
  };

  const reports = data?.reports ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="bg-default border-subtle rounded-lg border">
      <div className="border-subtle border-b p-4">
        <h2 className="text-emphasis text-lg font-semibold">{t("wrong_assignment_reports")}</h2>
        <p className="text-subtle text-sm">{t("wrong_assignment_reports_description")}</p>
      </div>

      <div className="border-subtle flex gap-2 border-b p-2">
        <Button
          color={activeTab === "pending" ? "primary" : "secondary"}
          onClick={() => handleTabChange("pending")}
          className="rounded-md">
          {t("pending")}
        </Button>
        <Button
          color={activeTab === "reviewed" ? "primary" : "secondary"}
          onClick={() => handleTabChange("reviewed")}
          className="rounded-md">
          {t("reviewed")}
        </Button>
      </div>

      <div className="overflow-x-auto">
        {isPending ? (
          <div className="p-4">
            <Skeleton className="mb-2 h-12 w-full" />
            <Skeleton className="mb-2 h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError ? (
          <div className="p-4">
            <EmptyScreen
              headline={t("error_loading_data")}
              description={t("try_again_later")}
              Icon="alert-triangle"
            />
          </div>
        ) : reports.length === 0 ? (
          <div className="p-4">
            <EmptyScreen
              headline={activeTab === "pending" ? t("no_pending_reports") : t("no_reviewed_reports")}
              description={
                activeTab === "pending"
                  ? t("no_pending_reports_description")
                  : t("no_reviewed_reports_description")
              }
              Icon="file-text"
            />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-subtle border-b">
                <th className="text-subtle px-4 py-3 text-left text-sm font-medium">{t("booking")}</th>
                <th className="text-subtle px-4 py-3 text-left text-sm font-medium">{t("routing_form")}</th>
                <th className="text-subtle px-4 py-3 text-left text-sm font-medium">{t("reported_by")}</th>
                <th className="text-subtle px-4 py-3 text-left text-sm font-medium">{t("correct_assignee")}</th>
                <th className="text-subtle px-4 py-3 text-left text-sm font-medium">{t("notes")}</th>
                <th className="text-subtle px-4 py-3 text-left text-sm font-medium">{t("status")}</th>
                <th className="text-subtle px-4 py-3 text-left text-sm font-medium">{t("reported_at")}</th>
                {activeTab === "reviewed" && (
                  <th className="text-subtle px-4 py-3 text-left text-sm font-medium">{t("reviewed_by")}</th>
                )}
                <th className="text-subtle px-4 py-3 text-left text-sm font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-subtle hover:bg-muted border-b">
                  <td className="px-4 py-3">
                    <div className="text-emphasis text-sm font-medium">{report.booking?.title ?? "-"}</div>
                    <div className="text-subtle text-xs">
                      {report.booking?.startTime ? formatDate(report.booking.startTime) : "-"}
                    </div>
                    <div className="text-subtle text-xs">
                      {t("host")}: {report.booking?.user?.name ?? report.booking?.user?.email ?? "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-emphasis text-sm">{report.routingForm?.name ?? t("unknown")}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-emphasis text-sm">{report.reportedBy?.name ?? "-"}</div>
                    <div className="text-subtle text-xs">{report.reportedBy?.email ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-emphasis text-sm">{report.correctAssignee ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-emphasis max-w-xs truncate text-sm" title={report.additionalNotes}>
                      {report.additionalNotes || "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={report.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-subtle text-sm">{formatDate(report.createdAt)}</div>
                  </td>
                  {activeTab === "reviewed" && (
                    <td className="px-4 py-3">
                      <div className="text-emphasis text-sm">{report.reviewedBy?.name ?? "-"}</div>
                      <div className="text-subtle text-xs">{formatDate(report.reviewedAt)}</div>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Dropdown>
                      <DropdownMenuTrigger asChild>
                        <Button color="secondary" size="sm" StartIcon="ellipsis" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="border-subtle flex items-center justify-between border-t p-4">
          <div className="text-subtle text-sm">
            {t("showing_x_of_y", { x: reports.length, y: totalCount })}
          </div>
          <div className="flex gap-2">
            <Button
              color="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}>
              {t("previous")}
            </Button>
            <Button
              color="secondary"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}>
              {t("next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
