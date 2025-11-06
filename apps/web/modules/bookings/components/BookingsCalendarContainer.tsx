"use client";

import { useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import { useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { useFacetedUniqueValues } from "~/bookings/hooks/useFacetedUniqueValues";

import { buildFilterColumns, getFilterColumnVisibility } from "../columns/filterColumns";
import type { RowData, BookingListingStatus } from "../types";
import { BookingsCalendar } from "./BookingsCalendar";

interface BookingsCalendarContainerProps {
  status: BookingListingStatus;
  permissions: {
    canReadOthersBookings: boolean;
  };
  data: RowData[];
}

export function BookingsCalendarContainer({ status, permissions, data }: BookingsCalendarContainerProps) {
  const { t } = useLocale();

  const columns = useMemo(() => {
    return buildFilterColumns({ t, permissions, status });
  }, [t, permissions, status]);

  const getFacetedUniqueValues = useFacetedUniqueValues();

  const table = useReactTable<RowData>({
    data,
    columns,
    initialState: {
      columnVisibility: getFilterColumnVisibility(),
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues,
  });

  return <BookingsCalendar status={status} table={table} />;
}
