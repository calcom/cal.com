import type { VisibilityState } from "@tanstack/react-table";
import { createColumnHelper } from "@tanstack/react-table";

import { ColumnFilterType } from "@calcom/features/data-table";

import type { RowData } from "../types";

interface BuildFilterColumnsParams {
  t: (key: string) => string;
  permissions: {
    canReadOthersBookings: boolean;
  };
  status: string;
}

/**
 * IDs of filter columns that should be hidden in the UI
 * These columns are used for filtering but not displayed
 */
const FILTER_COLUMN_IDS = [
  "eventTypeId",
  "teamId",
  "userId",
  "attendeeName",
  "attendeeEmail",
  "dateRange",
  "bookingUid",
] as const;

/**
 * Gets the column visibility state for filter columns
 * All filter columns are hidden by default as they only provide filtering functionality
 */
export function getFilterColumnVisibility(): VisibilityState {
  return Object.fromEntries(FILTER_COLUMN_IDS.map((id) => [id, false]));
}

export function buildFilterColumns({ t, permissions, status }: BuildFilterColumnsParams) {
  const columnHelper = createColumnHelper<RowData>();

  return [
    columnHelper.accessor((row) => (row.type === "data" ? row.booking.eventType.id : null), {
      id: "eventTypeId",
      header: t("event_type"),
      enableColumnFilter: true,
      enableSorting: false,
      cell: () => null,
      meta: {
        filter: {
          type: ColumnFilterType.MULTI_SELECT,
        },
      },
    }),
    columnHelper.accessor((row) => (row.type === "data" ? row.booking.eventType.team?.id ?? null : null), {
      id: "teamId",
      header: t("team"),
      enableColumnFilter: true,
      enableSorting: false,
      cell: () => null,
      meta: {
        filter: {
          type: ColumnFilterType.MULTI_SELECT,
        },
      },
    }),
    columnHelper.accessor((row) => (row.type === "data" ? row.booking.user?.id ?? null : null), {
      id: "userId",
      header: t("member"),
      enableColumnFilter: permissions.canReadOthersBookings,
      enableSorting: false,
      cell: () => null,
      meta: {
        filter: {
          type: ColumnFilterType.MULTI_SELECT,
        },
      },
    }),
    columnHelper.accessor((row) => row, {
      id: "attendeeName",
      header: t("attendee_name"),
      enableColumnFilter: true,
      enableSorting: false,
      cell: () => null,
      meta: {
        filter: {
          type: ColumnFilterType.TEXT,
        },
      },
    }),
    columnHelper.accessor((row) => row, {
      id: "attendeeEmail",
      header: t("attendee_email_variable"),
      enableColumnFilter: true,
      enableSorting: false,
      cell: () => null,
      meta: {
        filter: {
          type: ColumnFilterType.TEXT,
        },
      },
    }),
    columnHelper.accessor((row) => row, {
      id: "dateRange",
      header: t("date_range"),
      enableColumnFilter: true,
      enableSorting: false,
      cell: () => null,
      meta: {
        filter: {
          type: ColumnFilterType.DATE_RANGE,
          dateRangeOptions: {
            range: status === "past" ? "past" : status === "cancelled" ? "any" : "future", // upcoming, unconfirmed, recurring are all future-only
          },
        },
      },
    }),
    columnHelper.accessor((row) => (row.type === "data" ? row.booking.uid : null), {
      id: "bookingUid",
      header: t("booking_uid"),
      enableColumnFilter: true,
      enableSorting: false,
      cell: () => null,
      meta: {
        filter: {
          type: ColumnFilterType.TEXT,
          textOptions: {
            allowedOperators: ["equals"],
          },
        },
      },
    }),
  ];
}
