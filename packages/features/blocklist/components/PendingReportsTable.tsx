"use client";

import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { DataTableWrapper } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import type { BookingReport, BlocklistScope } from "../types";
import { BookingReportDetailsModal } from "./BookingReportDetailsModal";
import { usePendingReportsColumns } from "./PendingReportsColumns";

export interface PendingReportsTableProps<T extends BookingReport> {
  scope: BlocklistScope;
  data: T[];
  totalRowCount: number;
  isPending: boolean;
  limit: number;
  onAddToBlocklist: (reportIds: string[], type: "EMAIL" | "DOMAIN") => void;
  onDismiss: (reportId: string) => void;
  isAddingToBlocklist?: boolean;
  isDismissing?: boolean;
}

export function PendingReportsTable<T extends BookingReport>({
  scope,
  data,
  totalRowCount,
  isPending,
  limit,
  onAddToBlocklist,
  onDismiss,
  isAddingToBlocklist = false,
  isDismissing = false,
}: PendingReportsTableProps<T>) {
  const { t } = useLocale();

  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<T | null>(null);

  const handleViewDetails = (entry: T) => {
    setSelectedReport(entry);
    setShowReviewDialog(true);
  };

  const handleCloseModal = () => {
    setShowReviewDialog(false);
    setSelectedReport(null);
  };

  const columns = usePendingReportsColumns<T>({
    t,
    scope,
    onViewDetails: handleViewDetails,
  });

  const flatData = useMemo(() => data ?? [], [data]);

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
            customIcon={<img className="mb-6" src="/slash-icon-cards.svg" />}
            headline={t("no_pending_reports")}
            className="bg-muted mb-16"
            iconWrapperClassName="bg-default"
            dashedBorder={false}
          />
        }
        totalRowCount={totalRowCount}
      />

      <BookingReportDetailsModal
        scope={scope}
        entry={selectedReport}
        isOpen={showReviewDialog}
        onClose={handleCloseModal}
        onAddToBlocklist={onAddToBlocklist}
        onDismiss={onDismiss}
        isAddingToBlocklist={isAddingToBlocklist}
        isDismissing={isDismissing}
      />
    </>
  );
}
