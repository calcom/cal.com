"use client";

import type { Row } from "@tanstack/react-table";
import { useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import { useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

import { useFacetedUniqueValues } from "~/bookings/hooks/useFacetedUniqueValues";

import { buildFilterColumns } from "../columns/filterColumns";
import { buildListDisplayColumns } from "../columns/listColumns";
import type { RowData, BookingListingStatus } from "../types";
import { BookingsList } from "./BookingsList";

interface BookingsListContainerProps {
  status: BookingListingStatus;
  permissions: {
    canReadOthersBookings: boolean;
  };
  data: RowData[];
  isPending: boolean;
  totalRowCount?: number;
  onRowClick?: (row: Row<RowData>) => void;
}

export function BookingsListContainer({
  status,
  permissions,
  data,
  isPending,
  totalRowCount,
  onRowClick,
}: BookingsListContainerProps) {
  const { t } = useLocale();
  const user = useMeQuery().data;

  const columns = useMemo(() => {
    const filterCols = buildFilterColumns({ t, permissions, status });
    const listCols = buildListDisplayColumns({ t, user });
    return [...filterCols, ...listCols];
  }, [t, permissions, status, user]);

  const getFacetedUniqueValues = useFacetedUniqueValues();

  const table = useReactTable<RowData>({
    data,
    columns,
    initialState: {
      columnVisibility: {
        eventTypeId: false,
        teamId: false,
        userId: false,
        attendeeName: false,
        attendeeEmail: false,
        dateRange: false,
        bookingUid: false,
        date: true,
        time: true,
        event: true,
        who: true,
        team: true,
        actions: true,
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues,
  });

  return (
    <BookingsList
      status={status}
      table={table}
      isPending={isPending}
      totalRowCount={totalRowCount}
      onRowClick={onRowClick}
    />
  );
}
