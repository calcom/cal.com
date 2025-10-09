"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { format } from "date-fns";

import {
  DataTableWrapper,
  DataTableToolbar,
  ColumnFilterType,
  useDataTable,
} from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";

import { AddToWatchlistModal } from "./components/add-to-watchlist-modal";

type BookingReport = RouterOutputs["viewer"]["organizations"]["listBookingReports"]["rows"][number];

export function BookingReportsTable() {
  const { t } = useLocale();
  const { limit, offset, searchTerm } = useDataTable();

  const [selectedReport, setSelectedReport] = useState<BookingReport | null>(null);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);

  const { data, isPending } = trpc.viewer.organizations.listBookingReports.useQuery(
    {
      limit,
      offset,
      searchTerm,
      filters: {},
    },
    {
      placeholderData: keepPreviousData,
    }
  );

  const totalRowCount = data?.meta?.totalRowCount ?? 0;
  const flatData = useMemo<BookingReport[]>(() => data?.rows ?? [], [data]);

  const columns = useMemo<ColumnDef<BookingReport>[]>(
    () => [
      {
        id: "bookerEmail",
        header: t("booker_email"),
        accessorKey: "bookerEmail",
        size: 200,
        cell: ({ row }) => <span className="font-medium">{row.original.bookerEmail}</span>,
      },
      {
        id: "reporter",
        header: t("reported_by"),
        accessorFn: (row) => row.reporter.name || row.reporter.email,
        size: 150,
        cell: ({ row }) => (
          <span className="text-default">{row.original.reporter.name || row.original.reporter.email}</span>
        ),
      },
      {
        id: "reason",
        header: t("reason"),
        accessorKey: "reason",
        size: 120,
        meta: {
          filter: {
            type: ColumnFilterType.MULTI_SELECT,
          },
        },
        cell: ({ row }) => {
          const reasonColors: Record<string, "red" | "orange" | "gray"> = {
            SPAM: "red",
            DONT_KNOW_PERSON: "orange",
            OTHER: "gray",
          };
          return (
            <Badge variant={reasonColors[row.original.reason] || "gray"}>
              {t(row.original.reason.toLowerCase())}
            </Badge>
          );
        },
      },
      {
        id: "description",
        header: t("description"),
        accessorKey: "description",
        size: 250,
        cell: ({ row }) => {
          const desc = row.original.description;
          if (!desc) return <span className="text-subtle">—</span>;
          return (
            <span className="text-default truncate" title={desc}>
              {desc}
            </span>
          );
        },
      },
      {
        id: "bookingDate",
        header: t("booking_date"),
        accessorFn: (row) => row.booking.startTime,
        size: 180,
        cell: ({ row }) => (
          <span className="text-default">{format(new Date(row.original.booking.startTime), "PPP")}</span>
        ),
      },
      {
        id: "reportedAt",
        header: t("reported_at"),
        accessorKey: "createdAt",
        size: 200,
        cell: ({ row }) => (
          <span className="text-default">{format(new Date(row.original.createdAt), "PPp")}</span>
        ),
      },
      {
        id: "cancelled",
        header: t("cancelled"),
        accessorKey: "cancelled",
        size: 120,
        meta: {
          filter: {
            type: ColumnFilterType.SINGLE_SELECT,
          },
        },
        cell: ({ row }) => (
          <Badge variant={row.original.cancelled ? "green" : "gray"}>
            {row.original.cancelled ? t("yes") : t("no")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 150,
        enableResizing: false,
        cell: ({ row }) => {
          if (row.original.watchlistId) {
            return null;
          }
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedReport(row.original);
                setShowWatchlistModal(true);
              }}>
              {t("add_to_watchlist")}
            </Button>
          );
        },
      },
    ],
    [t]
  );

  const table = useReactTable({
    data: flatData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    getRowId: (row) => row.id,
  });

  return (
    <>
      <DataTableWrapper
        table={table}
        isPending={isPending}
        paginationMode="standard"
        totalRowCount={totalRowCount}
        ToolbarLeft={
          <>
            <DataTableToolbar.SearchBar />
          </>
        }
      />

      {selectedReport && (
        <AddToWatchlistModal
          open={showWatchlistModal}
          onClose={() => {
            setShowWatchlistModal(false);
            setSelectedReport(null);
          }}
          report={selectedReport}
        />
      )}
    </>
  );
}
