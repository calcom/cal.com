"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { DataTableWrapper, useDataTable } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { ConfirmationDialogContent, Dialog, DialogClose } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";

import { BookingReportEntryDetailsModal } from "./booking-report-entry-details-modal";
import { usePendingReportsColumns } from "./pending-reports-columns";

type BookingReport = RouterOutputs["viewer"]["organizations"]["listBookingReports"]["rows"][number];

interface PendingReportsTableProps {
  permissions?: {
    canRead: boolean;
    canCreate: boolean;
    canDelete: boolean;
  };
}

export function PendingReportsTable({ permissions }: PendingReportsTableProps) {
  const { t } = useLocale();
  const { limit, offset, searchTerm } = useDataTable();

  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<BookingReport | null>(null);
  const [reportToDelete, setReportToDelete] = useState<BookingReport | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data, isPending } = trpc.viewer.organizations.listBookingReports.useQuery(
    {
      limit,
      offset,
      searchTerm,
      filters: { hasWatchlist: false, status: ["PENDING"] },
    },
    {
      placeholderData: keepPreviousData,
    }
  );

  const utils = trpc.useUtils();

  const deleteBookingReport = trpc.viewer.organizations.deleteBookingReport.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listBookingReports.invalidate();
      showToast(t("booking_report_deleted"), "success");
      setShowDeleteDialog(false);
      setReportToDelete(null);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleViewDetails = (entry: BookingReport) => {
    setSelectedReport(entry);
    setShowReviewDialog(true);
  };

  const handleDelete = (entry: BookingReport) => {
    setReportToDelete(entry);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (reportToDelete) {
      deleteBookingReport.mutate({ reportId: reportToDelete.id });
    }
  };

  const columns = usePendingReportsColumns({
    t,
    canDelete: permissions?.canDelete,
    onViewDetails: handleViewDetails,
    onDelete: handleDelete,
  });

  const totalRowCount = data?.meta?.totalRowCount ?? 0;
  const flatData = useMemo(() => data?.rows ?? [], [data]);

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
        EmptyView={
          <EmptyScreen
            Icon="ban"
            headline={t("no_pending_reports")}
            className="bg-muted mb-16"
            iconWrapperClassName="bg-default"
            dashedBorder={false}
          />
        }
        totalRowCount={totalRowCount}
      />

      <BookingReportEntryDetailsModal
        entry={selectedReport}
        isOpen={showReviewDialog}
        onClose={() => {
          setShowReviewDialog(false);
          setSelectedReport(null);
        }}
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("delete_booking_report")}
          confirmBtn={
            <DialogClose color="destructive" onClick={confirmDelete}>
              {t("delete")}
            </DialogClose>
          }>
          {t("delete_booking_report_confirmation")}
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}
