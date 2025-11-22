"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { DataTableSelectionBar, DataTableWrapper, useDataTable } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";

import { BookingReportEntryDetailsModal } from "./booking-report-entry-details-modal";
import { BulkDismissReports } from "./BulkDismissReports";
import { usePendingReportsColumns } from "./pending-reports-columns";

type BookingReport = RouterOutputs["viewer"]["admin"]["watchlist"]["listReports"]["rows"][number];

export function PendingReportsTable() {
  const { t } = useLocale();
  const { limit, offset, searchTerm } = useDataTable();

  const [rowSelection, setRowSelection] = useState({});
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<BookingReport | null>(null);

  const { data, isPending } = trpc.viewer.admin.watchlist.listReports.useQuery(
    {
      limit,
      offset,
      searchTerm,
      filters: { status: ["PENDING"] },
    },
    {
      placeholderData: keepPreviousData,
    }
  );

  const handleViewDetails = (entry: BookingReport) => {
    setSelectedReport(entry);
    setShowReviewDialog(true);
  };

  const columns = usePendingReportsColumns({
    t,
    onViewDetails: handleViewDetails,
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
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    getRowId: (row) => row.id,
  });

  const numberOfSelectedRows = table.getFilteredSelectedRowModel().rows.length;
  const selectedReports = table.getSelectedRowModel().flatRows.map((row) => row.original);

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
        {numberOfSelectedRows > 0 && (
          <DataTableSelectionBar.Root className="!bottom-16 justify-center md:w-max">
            <p className="text-brand-subtle px-2 text-center text-xs leading-none sm:text-sm sm:font-medium">
              {t("number_selected", { count: numberOfSelectedRows })}
            </p>
            <BulkDismissReports
              reports={selectedReports}
              onRemove={() => table.toggleAllPageRowsSelected(false)}
            />
          </DataTableSelectionBar.Root>
        )}
      </DataTableWrapper>

      <BookingReportEntryDetailsModal
        entry={selectedReport}
        isOpen={showReviewDialog}
        onClose={() => {
          setShowReviewDialog(false);
          setSelectedReport(null);
        }}
      />
    </>
  );
}
