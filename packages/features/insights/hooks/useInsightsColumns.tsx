import { createColumnHelper } from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import startCase from "lodash/startCase";
import { useMemo } from "react";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { ColumnFilterType } from "@calcom/features/data-table";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RoutingFormFieldType } from "@calcom/routing-forms/lib/FieldTypes";
import { Badge } from "@calcom/ui/components/badge";
import { Icon } from "@calcom/ui/components/icon";

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
      }),
      columnHelper.accessor("bookingUserId", {
        id: "bookingUserId",
        header: t("member"),
        enableColumnFilter: true,
        enableSorting: false,
        meta: {
          filter: {
            type: ColumnFilterType.MULTI_SELECT,
          },
        },
        cell: () => null,
      }),
      columnHelper.accessor("bookingUid", {
        id: "bookingUid",
        header: t("uid"),
        size: 100,
        enableColumnFilter: false,
        enableSorting: false,
        cell: (info) => {
          const bookingUid = info.getValue();
          if (!bookingUid) return null;
          return <CopyButton label={bookingUid} value={bookingUid} />;
        },
      }),
      columnHelper.accessor("bookingUid", {
        id: "bookingLink",
        header: t("link"),
        size: 100,
        enableColumnFilter: false,
        enableSorting: false,
        cell: (info) => {
          const bookingUid = info.getValue();
          if (!bookingUid) return null;
          const bookingUrl = `${WEBAPP_URL}/booking/${bookingUid}`;
          const displayedUrl = bookingUrl.replace(/^https?:\/\//, "");
          return <CopyButton label={displayedUrl} value={bookingUrl} />;
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
      }),
      columnHelper.accessor("utm_source", {
        id: "utm_source",
        header: t("utm_source"),
        size: 100,
        enableColumnFilter: false,
        enableSorting: false,
        cell: (info) => {
          return (
            <div className="truncate">
              <span>{info.getValue()}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("utm_medium", {
        id: "utm_medium",
        header: "utm_medium",
        size: 100,
        enableColumnFilter: false,
        enableSorting: false,
        cell: (info) => {
          return (
            <div className="truncate">
              <span>{info.getValue()}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("utm_term", {
        id: "utm_term",
        header: "utm_term",
        size: 100,
        enableColumnFilter: false,
        enableSorting: false,
        cell: (info) => {
          return (
            <div className="truncate">
              <span>{info.getValue()}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("utm_content", {
        id: "utm_content",
        header: "utm_content",
        size: 100,
        enableColumnFilter: false,
        enableSorting: false,
        cell: (info) => {
          return (
            <div className="truncate">
              <span>{info.getValue()}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("utm_campaign", {
        id: "utm_campaign",
        header: "utm_campaign",
        size: 100,
        enableColumnFilter: false,
        enableSorting: false,
        cell: (info) => {
          return (
            <div className="truncate">
              <span>{info.getValue()}</span>
            </div>
          );
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
      }),
    ];
  }, [isHeadersSuccess, headers]);
};

function CopyButton({ label, value }: { label: string; value: string }) {
  const { copyToClipboard, isCopied } = useCopy();
  const { t } = useLocale();
  return (
    <button
      className="flex w-full items-center gap-1 overflow-hidden"
      title={value}
      onClick={() => {
        copyToClipboard(value);
      }}>
      {!isCopied && (
        <>
          <span className="truncate">{label}</span>
          <Icon name="clipboard" className="shrink-0" size={14} />
        </>
      )}
      {isCopied && (
        <>
          <span className="grow truncate text-left">{t("copied")}</span>
          <Icon name="check" className="shrink-0" size={14} />
        </>
      )}
    </button>
  );
}
