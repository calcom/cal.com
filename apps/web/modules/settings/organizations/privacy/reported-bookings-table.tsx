"use client";
// TODO: Reports will reappear if their associated blocklist entry is deleted
// due to the ON DELETE SET NULL constraint on BookingReport.watchlistId.
// This should be fixed by either:
// 1. Changing the FK constraint to ON DELETE RESTRICT, or
// 2. Updating WatchlistRepository.deleteEntry to prevent deletion of entries with associated reports
// See: packages/prisma/migrations/20251013185902_add_booking_report/migration.sql

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { DataTableWrapper, DataTableToolbar, useDataTable } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { showToast } from "@calcom/ui/components/toast";

type BookingReport = RouterOutputs["viewer"]["organizations"]["listBookingReports"]["rows"][number];

interface ReportedBookingsTableProps {
  permissions?: {
    canRead: boolean;
    canCreate: boolean;
    canDelete: boolean;
  };
}

export function ReportedBookingsTable({ permissions: _permissions }: ReportedBookingsTableProps) {
  const { t } = useLocale();
  const { limit, offset, searchTerm } = useDataTable();

  const [selectedReport, setSelectedReport] = useState<BookingReport | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<"block_email" | "block_domain" | "ignore" | null>(null);

  const { data, isPending } = trpc.viewer.organizations.listBookingReports.useQuery(
    {
      limit,
      offset,
      searchTerm,
    },
    {
      placeholderData: keepPreviousData,
    }
  );

  const utils = trpc.useUtils();

  const handleBookingReport = trpc.viewer.organizations.handleBookingReport.useMutation({
    onSuccess: async (data) => {
      await Promise.all([
        utils.viewer.organizations.listBookingReports.invalidate(),
        utils.viewer.organizations.listWatchlistEntries.invalidate(),

      ])
      showToast(data.message, "success");
      setShowActionDialog(false);
      setSelectedReport(null);
      setPendingAction(null);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleAction = (report: BookingReport, action: "block_email" | "block_domain" | "ignore") => {
    setSelectedReport(report);
    setPendingAction(action);
    setShowActionDialog(true);
  };

  const confirmAction = () => {
    if (selectedReport && pendingAction) {
      handleBookingReport.mutate({
        reportId: selectedReport.id,
        action: pendingAction,
      });
    }
  };

  const getActionText = () => {
    if (!pendingAction) return "";
    switch (pendingAction) {
      case "block_email":
        return t("block_this_email_address");
      case "block_domain":
        return t("block_this_domain");
      case "ignore":
        return t("ignore_this_report");
    }
  };

  const totalRowCount = data?.meta?.totalRowCount ?? 0;
  const flatData = useMemo<BookingReport[]>(() => data?.rows ?? [], [data]);

  const columns = useMemo<ColumnDef<BookingReport>[]>(
    () => [
      {
        id: "bookerEmail",
        header: t("booker_email"),
        accessorKey: "bookerEmail",
        enableHiding: false,
        cell: ({ row }) => <span className="text-emphasis">{row.original.bookerEmail}</span>,
      },
      {
        id: "reason",
        header: t("reason"),
        accessorKey: "reason",
        size: 120,
        cell: ({ row }) => (
          <Badge variant="orange">
            {row.original.reason === "SPAM"
              ? t("reason_spam")
              : row.original.reason === "DONT_KNOW_PERSON"
              ? t("reason_dont_know_person")
              : t("reason_other")}
          </Badge>
        ),
      },
      {
        id: "booking",
        header: t("booking"),
        size: 200,
        cell: ({ row }) => {
          const booking = row.original.booking;
          return booking ? (
            <div className="text-sm">
              <div className="text-emphasis">{booking.title}</div>
              <div className="text-subtle">{new Date(booking.startTime).toLocaleDateString()}</div>
            </div>
          ) : (
            <span className="text-subtle">—</span>
          );
        },
      },
      {
        id: "reportedBy",
        header: t("reported_by"),
        size: 150,
        cell: ({ row }) => {
          const reportedBy = row.original.reportedBy;
          return reportedBy ? (
            <span className="text-default">{reportedBy.name || reportedBy.email}</span>
          ) : (
            <span className="text-subtle">—</span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        size: 80,
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => {
          const report = row.original;
          return (
            <div className="flex items-center justify-end">
              <Dropdown>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="icon"
                    color="secondary"
                    StartIcon="ellipsis"
                    disabled={handleBookingReport.isPending}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem className="focus:outline-none">
                    <DropdownItem
                      type="button"
                      StartIcon="ban"
                      onClick={() => handleAction(report, "block_email")}>
                      {t("block_email")}
                    </DropdownItem>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:outline-none">
                    <DropdownItem
                      type="button"
                      StartIcon="globe"
                      onClick={() => handleAction(report, "block_domain")}>
                      {t("block_domain")}
                    </DropdownItem>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:outline-none">
                    <DropdownItem
                      type="button"
                      StartIcon="x"
                      onClick={() => handleAction(report, "ignore")}>
                      {t("ignore")}
                    </DropdownItem>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </Dropdown>
            </div>
          );
        },
      },
    ],
    [handleBookingReport.isPending, t]
  );

  const table = useReactTable({
    data: flatData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalRowCount / limit),
  });

  return (
    <>
      <DataTableWrapper
        table={table}
        isPending={isPending}
        variant="default"
        paginationMode="standard"
        totalRowCount={totalRowCount}>
        <div className="flex items-center justify-between">
          <DataTableToolbar.SearchBar />
        </div>
      </DataTableWrapper>

      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <ConfirmationDialogContent
          variety={pendingAction === "ignore" ? "warning" : "danger"}
          title={t("confirm")}
          confirmBtnText={t("confirm")}
          onConfirm={confirmAction}
          isPending={handleBookingReport.isPending}>
          {t("confirm_action", { action: getActionText(), email: selectedReport?.bookerEmail })}
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}
