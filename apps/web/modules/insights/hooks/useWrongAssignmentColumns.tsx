import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";

import { ColumnFilterType } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { WrongAssignmentReportStatus } from "@calcom/prisma/enums";
import { Badge } from "@calcom/ui/components/badge";

export type WrongAssignmentReportRow = {
  id: string;
  bookingUid: string;
  correctAssignee: string | null;
  additionalNotes: string;
  status: WrongAssignmentReportStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  booking: {
    id: number;
    title: string;
    startTime: Date;
    endTime: Date;
    user: { id: number; name: string | null; email: string } | null;
    attendees: { name: string; email: string }[];
    routedFromRoutingFormReponse: { id: number } | null;
  } | null;
  reportedBy: { id: number; name: string | null; email: string };
  routingForm: { id: string; name: string } | null;
  reviewedBy: { id: number; name: string | null; email: string } | null;
};

const statusVariantMap: Record<WrongAssignmentReportStatus, "default" | "success" | "warning" | "gray"> = {
  PENDING: "warning",
  REVIEWED: "default",
  RESOLVED: "success",
  DISMISSED: "gray",
};

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

export const useWrongAssignmentColumns = () => {
  const { t } = useLocale();

  return useMemo(() => {
    const columnHelper = createColumnHelper<WrongAssignmentReportRow>();

    return [
      // Hidden filterable columns
      columnHelper.accessor((row) => row.routingForm?.id ?? null, {
        id: "routingFormId",
        header: t("routing_form"),
        enableColumnFilter: true,
        enableSorting: false,
        meta: {
          filter: { type: ColumnFilterType.SINGLE_SELECT },
        },
        cell: () => null,
      }),
      columnHelper.accessor((row) => row.reportedBy.id, {
        id: "reportedById",
        header: t("reported_by"),
        enableColumnFilter: true,
        enableSorting: false,
        meta: {
          filter: { type: ColumnFilterType.SINGLE_SELECT },
        },
        cell: () => null,
      }),

      // Display columns
      columnHelper.accessor("booking", {
        id: "booking",
        header: t("booking"),
        enableColumnFilter: false,
        size: 220,
        cell: (info) => {
          const booking = info.getValue();
          if (!booking) return "-";
          return (
            <div>
              <div className="text-emphasis text-sm font-medium">{booking.title}</div>
              <div className="text-subtle text-xs">{formatDate(booking.startTime)}</div>
              <div className="text-subtle text-xs">
                {t("host")}: {booking.user?.name ?? booking.user?.email ?? "-"}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => row.routingForm?.name ?? null, {
        id: "routingFormName",
        header: t("routing_form"),
        enableColumnFilter: false,
        size: 150,
        cell: (info) => <span className="text-emphasis text-sm">{info.getValue() ?? t("unknown")}</span>,
      }),
      columnHelper.accessor((row) => row.reportedBy.name ?? row.reportedBy.email, {
        id: "reportedByName",
        header: t("reported_by"),
        enableColumnFilter: false,
        size: 150,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <div className="text-emphasis text-sm">{row.reportedBy.name ?? "-"}</div>
              <div className="text-subtle text-xs">{row.reportedBy.email}</div>
            </div>
          );
        },
      }),
      columnHelper.accessor("correctAssignee", {
        id: "correctAssignee",
        header: t("correct_assignee"),
        enableColumnFilter: false,
        size: 150,
        cell: (info) => <span className="text-emphasis text-sm">{info.getValue() ?? "-"}</span>,
      }),
      columnHelper.accessor("additionalNotes", {
        id: "additionalNotes",
        header: t("notes"),
        enableColumnFilter: false,
        size: 200,
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className="text-emphasis max-w-xs truncate text-sm" title={val}>
              {val || "-"}
            </span>
          );
        },
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: t("status"),
        enableColumnFilter: false,
        size: 100,
        cell: (info) => {
          const status = info.getValue();
          return <Badge variant={statusVariantMap[status]}>{t(status.toLowerCase())}</Badge>;
        },
      }),
      columnHelper.accessor("createdAt", {
        id: "createdAt",
        header: t("reported_at"),
        enableColumnFilter: false,
        size: 160,
        cell: (info) => <span className="text-subtle text-sm">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.accessor("reviewedBy", {
        id: "reviewedBy",
        header: t("reviewed_by"),
        enableColumnFilter: false,
        size: 150,
        cell: (info) => {
          const reviewer = info.getValue();
          const row = info.row.original;
          if (!reviewer) return "-";
          return (
            <div>
              <div className="text-emphasis text-sm">{reviewer.name ?? "-"}</div>
              <div className="text-subtle text-xs">{formatDate(row.reviewedAt)}</div>
            </div>
          );
        },
      }),
    ];
  }, [t]);
};
