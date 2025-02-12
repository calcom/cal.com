import { createColumnHelper } from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import startCase from "lodash/startCase";
import { useMemo } from "react";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { dataTableFilter, ColumnFilterType } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RoutingFormFieldType } from "@calcom/routing-forms/lib/FieldTypes";
import { Badge } from "@calcom/ui";

import { BookedByCell } from "../components/BookedByCell";
import { BookingAtCell } from "../components/BookingAtCell";
import { BookingStatusBadge } from "../components/BookingStatusBadge";
import { ResponseValueCell } from "../components/ResponseValueCell";
import type { HeaderRow, RoutingFormTableRow } from "../lib/types";
import {
  ZResponseMultipleValues,
  ZResponseSingleValue,
  ZResponseTextValue,
  ZResponseNumericValue,
} from "../lib/types";

export const useInsightsColumns = ({
  headers,
  isHeadersSuccess,
}: {
  headers: HeaderRow[] | undefined;
  isHeadersSuccess: boolean;
}) => {
  const { t } = useLocale();

  return useMemo(() => {
    if (!isHeadersSuccess) {
      return [];
    }
    const columnHelper = createColumnHelper<RoutingFormTableRow>();

    return [
      columnHelper.accessor("formId", {
        id: "formId",
        header: t("routing_forms"),
        enableColumnFilter: true,
        enableSorting: false,
        meta: {
          filter: { type: ColumnFilterType.SINGLE_SELECT },
        },
        cell: () => null,
        filterFn: (row, id, filterValue) => {
          const cellValue = row.original.formId;
          return dataTableFilter(cellValue, filterValue);
        },
      }),
      columnHelper.accessor("bookingUserId", {
        id: "bookingUserId",
        header: t("user"),
        enableColumnFilter: true,
        enableSorting: false,
        meta: {
          filter: {
            type: ColumnFilterType.MULTI_SELECT,
          },
        },
        cell: () => null,
        filterFn: (row, id, filterValue) => {
          const cellValue = row.original.bookingUserId;
          return dataTableFilter(cellValue, filterValue);
        },
      }),
      columnHelper.accessor("bookingAttendees", {
        id: "bookingAttendees",
        header: t("routing_form_insights_booked_by"),
        size: 200,
        enableColumnFilter: false,
        enableSorting: false,
        cell: (info) => {
          return <BookedByCell attendees={info.getValue()} rowId={info.row.original.id} />;
        },
      }),

      ...((headers || []).map((fieldHeader) => {
        const isText = [
          RoutingFormFieldType.TEXT,
          RoutingFormFieldType.EMAIL,
          RoutingFormFieldType.PHONE,
          RoutingFormFieldType.TEXTAREA,
        ].includes(fieldHeader.type as RoutingFormFieldType);

        const isNumber = fieldHeader.type === RoutingFormFieldType.NUMBER;

        const isSingleSelect = fieldHeader.type === RoutingFormFieldType.SINGLE_SELECT;
        const isMultiSelect = fieldHeader.type === RoutingFormFieldType.MULTI_SELECT;

        const filterType = isSingleSelect
          ? ColumnFilterType.SINGLE_SELECT
          : isNumber
          ? ColumnFilterType.NUMBER
          : isText
          ? ColumnFilterType.TEXT
          : ColumnFilterType.MULTI_SELECT;

        const optionMap =
          fieldHeader.options?.reduce((acc, option) => {
            if (option.id) {
              acc[option.id] = option.label;
            }
            return acc;
          }, {} as Record<string, string>) ?? {};

        return columnHelper.accessor(`response.${fieldHeader.id}`, {
          id: fieldHeader.id,
          header: startCase(fieldHeader.label),
          enableSorting: false,
          cell: (info) => {
            const values = info.getValue();
            if (isMultiSelect || isSingleSelect) {
              const result = z.union([ZResponseMultipleValues, ZResponseSingleValue]).safeParse(values);
              return (
                result.success && (
                  <ResponseValueCell
                    optionMap={optionMap}
                    values={Array.isArray(result.data.value) ? result.data.value : [result.data.value]}
                    rowId={info.row.original.id}
                  />
                )
              );
            } else if (isText || isNumber) {
              const result = z.union([ZResponseTextValue, ZResponseNumericValue]).safeParse(values);
              return (
                result.success && (
                  <div className="truncate">
                    <span title={String(result.data.value)}>{result.data.value}</span>
                  </div>
                )
              );
            } else {
              return null;
            }
          },
          meta: {
            filter: { type: filterType },
          },
          filterFn: (row, id, filterValue) => {
            const cellValue = row.original.response[id]?.value;
            return dataTableFilter(cellValue, filterValue);
          },
        });
      }) ?? []),
      columnHelper.accessor("bookingStatusOrder", {
        id: "bookingStatusOrder",
        header: t("routing_form_insights_booking_status"),
        sortDescFirst: false,
        cell: (info) => (
          <div className="max-w-[250px]">
            <BookingStatusBadge bookingStatus={info.row.original.bookingStatus} />
          </div>
        ),
        meta: {
          filter: { type: ColumnFilterType.MULTI_SELECT, icon: "circle" },
        },
        filterFn: (row, id, filterValue) => {
          const cellValue = row.original.bookingStatusOrder;
          return dataTableFilter(cellValue, filterValue);
        },
        sortingFn: (rowA, rowB) => {
          const statusA = rowA.original.bookingStatusOrder ?? 6; // put it at the end if bookingStatusOrder is null
          const statusB = rowB.original.bookingStatusOrder ?? 6;
          return statusA - statusB;
        },
      }),
      columnHelper.accessor("bookingCreatedAt", {
        id: "bookingCreatedAt",
        header: t("routing_form_insights_booking_at"),
        enableColumnFilter: false,
        cell: (info) => (
          <div className="max-w-[250px]">
            <BookingAtCell row={info.row.original} rowId={info.row.original.id} />
          </div>
        ),
        sortingFn: (rowA, rowB) => {
          const dateA = rowA.original.bookingCreatedAt;
          const dateB = rowB.original.bookingCreatedAt;
          if (!dateA && !dateB) return 0;
          if (!dateA) return -1;
          if (!dateB) return 1;
          if (!(dateA instanceof Date) || !(dateB instanceof Date)) return 0;

          return dateA.getTime() - dateB.getTime();
        },
      }),
      columnHelper.accessor("bookingAssignmentReason", {
        id: "bookingAssignmentReason",
        header: t("routing_form_insights_assignment_reason"),
        enableColumnFilter: true,
        enableSorting: false,
        meta: {
          filter: { type: ColumnFilterType.TEXT },
        },
        cell: (info) => {
          const assignmentReason = info.getValue();
          return <div className="max-w-[250px]">{assignmentReason}</div>;
        },
        filterFn: (row, id, filterValue) => {
          const reason = row.original.bookingAssignmentReason;
          return dataTableFilter(reason, filterValue);
        },
      }),
      columnHelper.accessor("createdAt", {
        id: "createdAt",
        header: t("routing_form_insights_submitted_at"),
        // exclude from "Filters" component
        // because we already have a DateRangeFilter component
        enableColumnFilter: false,
        cell: (info) => (
          <div className="whitespace-nowrap">
            <Badge variant="gray">{dayjs(info.getValue()).format("MMM D, YYYY HH:mm")}</Badge>
          </div>
        ),
        filterFn: (row, id, filterValue) => {
          const createdAt = row.original.createdAt;
          return dataTableFilter(createdAt, filterValue);
        },
      }),
    ];
  }, [isHeadersSuccess, headers]);
};
