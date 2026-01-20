"use client";

import type { RowSelectionState } from "@tanstack/react-table";
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { DataTableSelectionBar, DataTableWrapper } from "~/data-table/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { WatchlistType } from "@calcom/prisma/enums";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import type { GroupedBookingReport, BlocklistScope } from "../types";
import { BookingReportDetailsModal } from "./BookingReportDetailsModal";
import { usePendingReportsColumns } from "./PendingReportsColumns";

export type SortByOption = "createdAt" | "reportCount";

export interface PendingReportsTableProps<T extends GroupedBookingReport> {
  scope: BlocklistScope;
  data: T[];
  totalRowCount: number;
  isPending: boolean;
  limit: number;
  onAddToBlocklist: (email: string, type: WatchlistType, onSuccess: () => void) => void;
  onDismiss: (email: string, onSuccess: () => void) => void;
  isAddingToBlocklist?: boolean;
  isDismissing?: boolean;
  enableRowSelection?: boolean;
  renderBulkActions?: (selectedReports: T[], clearSelection: () => void) => ReactNode;
}

export function PendingReportsTable<T extends GroupedBookingReport>({
  scope,
  data,
  totalRowCount,
  isPending,
  limit,
  onAddToBlocklist,
  onDismiss,
  isAddingToBlocklist = false,
  isDismissing = false,
  enableRowSelection = false,
  renderBulkActions,
}: PendingReportsTableProps<T>) {
  const { t } = useLocale();

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
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
    enableRowSelection,
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
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    getRowId: (row) => row.bookerEmail,
  });

  const numberOfSelectedRows = table.getFilteredSelectedRowModel().rows.length;
  const selectedReports = table.getSelectedRowModel().flatRows.map((row) => row.original);
  const clearSelection = () => table.toggleAllPageRowsSelected(false);

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
        totalRowCount={totalRowCount}>
        {enableRowSelection && numberOfSelectedRows > 0 && renderBulkActions && (
          <DataTableSelectionBar.Root className="bottom-16! justify-center md:w-max">
            <p className="text-brand-subtle px-2 text-center text-xs leading-none sm:text-sm sm:font-medium">
              {t("number_selected", { count: numberOfSelectedRows })}
            </p>
            {renderBulkActions(selectedReports, clearSelection)}
          </DataTableSelectionBar.Root>
        )}
      </DataTableWrapper>

      <BookingReportDetailsModal
        scope={scope}
        entry={selectedReport}
        isOpen={showReviewDialog}
        onClose={handleCloseModal}
        onAddToBlocklist={(email, type) => onAddToBlocklist(email, type, handleCloseModal)}
        onDismiss={(email) => onDismiss(email, handleCloseModal)}
        isAddingToBlocklist={isAddingToBlocklist}
        isDismissing={isDismissing}
      />
    </>
  );
}
