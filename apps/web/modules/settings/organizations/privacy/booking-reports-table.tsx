"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import {
  DataTableWrapper,
  DataTableToolbar,
  DataTableFilters,
  ColumnFilterType,
  useDataTable,
  useColumnFilters,
  convertFacetedValuesToMap,
  DataTableSelectionBar,
} from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
} from "@calcom/ui/components/dropdown";
import { Checkbox } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { AddToBlocklistModal } from "./components/add-to-blocklist-modal";
import { BookingReportDetailsSheet } from "./components/booking-report-details-sheet";
import { BulkAddToBlocklist } from "./components/bulk-add-to-blocklist";

type BookingReport = RouterOutputs["viewer"]["organizations"]["listBookingReports"]["rows"][number];

export function BookingReportsTable() {
  const { t } = useLocale();
  const { limit, offset, searchTerm } = useDataTable();
  const columnFilters = useColumnFilters();

  const [selectedReport, setSelectedReport] = useState<BookingReport | null>(null);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rowSelection, setRowSelection] = useState({});

  const filters = useMemo(() => {
    const hasWatchlistFilter = columnFilters.find((f) => f.id === "hasWatchlist");

    let hasWatchlistValue: boolean | undefined = undefined;

    if (hasWatchlistFilter && hasWatchlistFilter.value.type === ColumnFilterType.MULTI_SELECT) {
      const filterValues = hasWatchlistFilter.value.data;
      if (Array.isArray(filterValues) && filterValues.length > 0) {
        if (filterValues.length === 2 || filterValues.length === 0) {
          hasWatchlistValue = undefined;
        } else {
          hasWatchlistValue = filterValues[0] === "true";
        }
      }
    }

    return {
      hasWatchlist: hasWatchlistValue,
    };
  }, [columnFilters]);

  const { data, isPending } = trpc.viewer.organizations.listBookingReports.useQuery(
    {
      limit,
      offset,
      searchTerm,
      filters,
    },
    {
      placeholderData: keepPreviousData,
    }
  );

  const utils = trpc.useUtils();

  const deleteReportMutation = trpc.viewer.organizations.deleteBookingReport.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listBookingReports.invalidate();
      showToast(t("booking_report_deleted"), "success");
      setShowDeleteDialog(false);
      setSelectedReport(null);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const totalRowCount = data?.meta?.totalRowCount ?? 0;
  const flatData = useMemo<BookingReport[]>(() => data?.rows ?? [], [data]);

  const columns = useMemo<ColumnDef<BookingReport>[]>(
    () => [
      {
        id: "select",
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        size: 30,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
      },
      {
        id: "bookerEmail",
        header: t("booker_email"),
        accessorKey: "bookerEmail",
        enableHiding: false,
        cell: ({ row }) => <span className="text-emphasis font-medium">{row.original.bookerEmail}</span>,
      },
      {
        id: "reportedBy",
        header: t("reported_by"),
        accessorFn: (row) => row.reporter?.email ?? "-",
        size: 180,
        cell: ({ row }) => <span className="text-default">{row.original.reporter?.email ?? "-"}</span>,
      },
      {
        id: "reason",
        header: t("reason"),
        accessorKey: "reason",
        size: 90,
        meta: {
          type: ColumnFilterType.MULTI_SELECT,
        },
        cell: ({ row }) => {
          const reasonColors: Record<string, "red" | "orange" | "gray"> = {
            SPAM: "red",
            DONT_KNOW_PERSON: "orange",
            OTHER: "gray",
          };
          const reason = t(row.original.reason.toLowerCase());
          return (
            <Badge variant={reasonColors[row.original.reason] || "gray"}>
              {reason.charAt(0).toUpperCase() + reason.slice(1)}
            </Badge>
          );
        },
      },
      {
        id: "hasWatchlist",
        header: t("in_blocklist"),
        accessorFn: (row) => (row.watchlistId ? "true" : "false"),
        size: 120,
        meta: {
          type: ColumnFilterType.MULTI_SELECT,
        },
        cell: ({ row }) => (
          <Badge variant={row.original.watchlistId ? "blue" : "gray"}>
            {row.original.watchlistId ? t("yes") : t("no")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 90,
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => {
          const report = row.original;
          return (
            <div className="flex items-center justify-end">
              <ButtonGroup combined containerProps={{ className: "border-default hidden md:flex" }}>
                <Tooltip content={t("view_booking_page")}>
                  <Button
                    target="_blank"
                    href={`/booking/${report.booking.uid}`}
                    color="secondary"
                    variant="icon"
                    StartIcon="external-link"
                  />
                </Tooltip>
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="radix-state-open:rounded-r-md"
                      color="secondary"
                      variant="icon"
                      StartIcon="ellipsis"
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowDetailsSheet(true);
                          }}
                          StartIcon="eye">
                          {t("view")}
                        </DropdownItem>
                      </DropdownMenuItem>
                      {!report.watchlistId && (
                        <DropdownMenuItem>
                          <DropdownItem
                            type="button"
                            onClick={() => {
                              setSelectedReport(report);
                              setShowWatchlistModal(true);
                            }}
                            StartIcon="shield-check">
                            {t("add_to_blocklist")}
                          </DropdownItem>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowDeleteDialog(true);
                          }}
                          color="destructive"
                          StartIcon="trash">
                          {t("delete")}
                        </DropdownItem>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </Dropdown>
              </ButtonGroup>
              <div className="flex md:hidden">
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="icon" color="minimal" StartIcon="ellipsis" />
                  </DropdownMenuTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuContent>
                      <DropdownMenuItem className="outline-none">
                        <DropdownItem
                          href={`/booking/${report.booking.uid}`}
                          target="_blank"
                          type="button"
                          StartIcon="external-link">
                          {t("view_booking_page")}
                        </DropdownItem>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowDetailsSheet(true);
                          }}
                          StartIcon="eye">
                          {t("view")}
                        </DropdownItem>
                      </DropdownMenuItem>
                      {!report.watchlistId && (
                        <DropdownMenuItem>
                          <DropdownItem
                            type="button"
                            onClick={() => {
                              setSelectedReport(report);
                              setShowWatchlistModal(true);
                            }}
                            StartIcon="shield-check">
                            {t("add_to_blocklist")}
                          </DropdownItem>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          color="destructive"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowDeleteDialog(true);
                          }}
                          StartIcon="trash">
                          {t("delete")}
                        </DropdownItem>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </Dropdown>
              </div>
            </div>
          );
        },
      },
    ],
    [t, setSelectedReport, setShowDetailsSheet]
  );

  const table = useReactTable({
    data: flatData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    getRowId: (row) => row.id,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    getFacetedUniqueValues: (_, columnId) => () => {
      switch (columnId) {
        case "hasWatchlist":
          return convertFacetedValuesToMap([
            { label: t("no"), value: "false" },
            { label: t("yes"), value: "true" },
          ]);
        case "reason":
          return convertFacetedValuesToMap([
            { label: t("spam"), value: "SPAM" },
            { label: t("dont_know_person"), value: "DONT_KNOW_PERSON" },
            { label: t("other"), value: "OTHER" },
          ]);
        default:
          return new Map();
      }
    },
  });

  const numberOfSelectedRows = table.getFilteredSelectedRowModel().rows.length;

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
            <DataTableFilters.FilterBar table={table} />
          </>
        }
        ToolbarRight={
          <>
            <DataTableFilters.ClearFiltersButton />
          </>
        }>
        {numberOfSelectedRows > 0 && (
          <DataTableSelectionBar.Root className="!bottom-16 justify-center md:w-max">
            <p className="text-brand-subtle px-2 text-center text-xs leading-none sm:text-sm sm:font-medium">
              {t("number_selected", { count: numberOfSelectedRows })}
            </p>
            <BulkAddToBlocklist
              reports={table.getSelectedRowModel().flatRows.map((row) => row.original)}
              onSuccess={() => table.toggleAllPageRowsSelected(false)}
            />
          </DataTableSelectionBar.Root>
        )}
      </DataTableWrapper>

      {selectedReport && showDetailsSheet && (
        <BookingReportDetailsSheet
          open={showDetailsSheet}
          onClose={() => {
            setShowDetailsSheet(false);
            setSelectedReport(null);
          }}
          report={selectedReport}
          onAddToWatchlist={
            !selectedReport.watchlistId
              ? () => {
                  setShowDetailsSheet(false);
                  setShowWatchlistModal(true);
                }
              : undefined
          }
        />
      )}

      {selectedReport && showWatchlistModal && (
        <AddToBlocklistModal
          open={showWatchlistModal}
          onClose={() => {
            setShowWatchlistModal(false);
            setSelectedReport(null);
          }}
          report={selectedReport}
        />
      )}

      {selectedReport && showDeleteDialog && (
        <Dialog
          open={showDeleteDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowDeleteDialog(false);
              setSelectedReport(null);
            }
          }}>
          <ConfirmationDialogContent
            variety="danger"
            title={t("delete_booking_report")}
            confirmBtnText={t("delete")}
            onConfirm={() => {
              deleteReportMutation.mutate({ reportId: selectedReport.id });
            }}>
            {t("delete_booking_report_confirmation")}
          </ConfirmationDialogContent>
        </Dialog>
      )}
    </>
  );
}
