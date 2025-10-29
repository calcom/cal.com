"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { DataTableWrapper, DataTableToolbar, useDataTable } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { DialogClose } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { ToggleGroup } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import { BlocklistEntryDetailsSheet } from "./components/blocklist-entry-details-sheet";
import { BookingReportEntryDetailsModal } from "./components/booking-report-entry-details-modal";
import { CreateBlocklistEntryModal } from "./components/create-blocklist-entry-modal";

type BlocklistEntry = RouterOutputs["viewer"]["organizations"]["listWatchlistEntries"]["rows"][number];
type BookingReport = RouterOutputs["viewer"]["organizations"]["listBookingReports"]["rows"][number];
type ViewType = "blocked" | "pending";

interface BlocklistTableProps {
  permissions?: {
    canRead: boolean;
    canCreate: boolean;
    canDelete: boolean;
  };
}

export function BlocklistTable({ permissions }: BlocklistTableProps) {
  const { t } = useLocale();
  const { limit, offset, searchTerm } = useDataTable();

  const [activeView, setActiveView] = useState<ViewType>("blocked");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<BlocklistEntry | null>(null);
  const [selectedReport, setSelectedReport] = useState<BookingReport | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<BlocklistEntry | null>(null);
  const [reportToDelete, setReportToDelete] = useState<BookingReport | null>(null);
  const [showDeleteEntryDialog, setShowDeleteEntryDialog] = useState(false);
  const [showDeleteReportDialog, setShowDeleteReportDialog] = useState(false);

  const blockedQuery = trpc.viewer.organizations.listWatchlistEntries.useQuery(
    {
      limit,
      offset,
      searchTerm,
    },
    {
      placeholderData: keepPreviousData,
      enabled: activeView === "blocked",
    }
  );

  const pendingQuery = trpc.viewer.organizations.listBookingReports.useQuery(
    {
      limit,
      offset,
      searchTerm,
      filters: { hasWatchlist: false },
    },
    {
      placeholderData: keepPreviousData,
      enabled: activeView === "pending",
    }
  );

  const data = activeView === "blocked" ? blockedQuery.data : pendingQuery.data;
  const isPending = activeView === "blocked" ? blockedQuery.isPending : pendingQuery.isPending;

  const utils = trpc.useUtils();

  const deleteWatchlistEntry = trpc.viewer.organizations.deleteWatchlistEntry.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listWatchlistEntries.invalidate();
      showToast(t("blocklist_entry_deleted"), "success");
      setShowDeleteEntryDialog(false);
      setEntryToDelete(null);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const deleteBookingReport = trpc.viewer.organizations.deleteBookingReport.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listBookingReports.invalidate();
      showToast(t("booking_report_deleted"), "success");
      setShowDeleteReportDialog(false);
      setReportToDelete(null);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleDelete = (entry: BlocklistEntry | BookingReport) => {
    if ("value" in entry) {
      setEntryToDelete(entry);
      setShowDeleteEntryDialog(true);
    } else {
      setReportToDelete(entry);
      setShowDeleteReportDialog(true);
    }
  };

  const confirmDeleteEntry = () => {
    if (entryToDelete) {
      deleteWatchlistEntry.mutate({ id: entryToDelete.id });
    }
  };

  const confirmDeleteReport = () => {
    if (reportToDelete) {
      deleteBookingReport.mutate({ reportId: reportToDelete.id });
    }
  };

  const handleViewDetails = (entry: BlocklistEntry) => {
    setSelectedEntry(entry);
    setShowDetailsSheet(true);
  };

  const handleBookingReportViewDetails = (entry: BookingReport) => {
    setSelectedReport(entry);
    setShowReviewDialog(true);
  };

  const totalRowCount = data?.meta?.totalRowCount ?? 0;
  const flatData = useMemo(() => data?.rows ?? [], [data]);

  const blockedColumns = useMemo<ColumnDef<BlocklistEntry>[]>(
    () => [
      {
        id: "email_slash_domain",
        header: t("email_slash_domain"),
        accessorKey: "value",
        enableHiding: false,
        cell: ({ row }) => <span className="text-emphasis">{row.original.value}</span>,
      },
      {
        id: "type",
        header: t("type"),
        accessorKey: "type",
        size: 100,
        cell: ({ row }) => (
          <Badge variant="blue">{row.original.type === "EMAIL" ? t("email") : t("domain")}</Badge>
        ),
      },
      {
        id: "createdBy",
        header: t("blocked_by"),
        size: 180,
        cell: ({ row }) => {
          const audit = row.original.audits?.[0] as
            | { changedByUserId: number | null }
            | {
                changedByUser?: { id: number; email: string; name: string | null } | undefined;
                changedByUserId: number | null;
              }
            | undefined;
          const email =
            (audit && "changedByUser" in audit ? audit.changedByUser?.email : undefined) ?? undefined;
          return <span className="text-default">{email ?? "—"}</span>;
        },
      },
      {
        id: "actions",
        header: "",
        size: 90,
        minSize: 90,
        maxSize: 90,
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => {
          const entry = row.original;
          return (
            <div className="flex items-center justify-end">
              <Dropdown modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="icon" color="secondary" StartIcon="ellipsis" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <DropdownItem type="button" StartIcon="eye" onClick={() => handleViewDetails(entry)}>
                      {t("view_details")}
                    </DropdownItem>
                  </DropdownMenuItem>
                  {permissions?.canDelete && (
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        color="destructive"
                        StartIcon="trash"
                        onClick={() => handleDelete(entry)}>
                        {t("remove_from_blocklist")}
                      </DropdownItem>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </Dropdown>
            </div>
          );
        },
      },
    ],
    [t, permissions?.canDelete]
  );

  const pendingColumns = useMemo<ColumnDef<BookingReport>[]>(
    () => [
      {
        id: "emailOrDomain",
        header: t("email_slash_domain"),
        accessorKey: "bookerEmail",
        enableHiding: false,
        size: 250,
        cell: ({ row }) => {
          const email = row.original.bookerEmail;
          return (
            <div className="flex flex-col">
              <span className="text-emphasis font-medium">{email}</span>
            </div>
          );
        },
      },
      {
        id: "reportedBy",
        header: t("reported_by"),
        accessorFn: (row) => row.reporter?.email ?? "-",
        size: 250,
        cell: ({ row }) => <span className="text-default">{row.original.reporter?.email ?? "-"}</span>,
      },
      {
        id: "reason",
        header: t("reason"),
        size: 150,
        cell: ({ row }) => {
          console.log("repw", row.original);
          const reason = row.original.reason.toLowerCase();
          const capitalizedReason = reason.charAt(0).toUpperCase() + reason.slice(1);

          return <Badge variant="blue">{capitalizedReason}</Badge>;
        },
      },

      {
        id: "actions",
        header: "",
        size: 90,
        minSize: 90,
        maxSize: 90,
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => {
          const entry = row.original;
          return (
            <div className="flex items-center justify-end">
              <Dropdown modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="icon" color="secondary" StartIcon="ellipsis" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <DropdownItem
                      type="button"
                      StartIcon="eye"
                      onClick={() => handleBookingReportViewDetails(entry)}>
                      {t("view_details")}
                    </DropdownItem>
                  </DropdownMenuItem>
                  {permissions?.canDelete && (
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        color="destructive"
                        StartIcon="trash"
                        onClick={() => handleDelete(entry)}>
                        {t("delete")}
                      </DropdownItem>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </Dropdown>
            </div>
          );
        },
      },
    ],
    [t, permissions?.canDelete]
  );

  const columns = activeView === "blocked" ? blockedColumns : pendingColumns;

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
        key={activeView}
        table={table}
        isPending={isPending}
        variant="default"
        paginationMode="standard"
        EmptyView={
          activeView === "blocked" ? (
            <EmptyScreen
              Icon="phone"
              headline={searchTerm ? t("no_result_found_for", { searchTerm }) : t("no_entries")}
              description={t("no_entries_description")}
              className="bg-muted mb-16"
              iconWrapperClassName="bg-default"
              dashedBorder={false}
            />
          ) : (
            <EmptyScreen
              Icon="ban"
              headline={t("no_pending_reports")}
              className="bg-muted mb-16"
              iconWrapperClassName="bg-default"
              dashedBorder={false}
            />
          )
        }
        totalRowCount={totalRowCount}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ToggleGroup
              value={activeView}
              onValueChange={(value) => {
                if (value) setActiveView(value as ViewType);
              }}
              options={[
                { value: "blocked", label: t("blocked") },
                { value: "pending", label: t("pending") },
              ]}
            />
            <DataTableToolbar.SearchBar />
          </div>
          <div className="flex items-center gap-2">
            {permissions?.canCreate && (
              <Button color="primary" StartIcon="plus" onClick={() => setShowCreateModal(true)}>
                {t("add")}
              </Button>
            )}
          </div>
        </div>
      </DataTableWrapper>

      <CreateBlocklistEntryModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />

      <BlocklistEntryDetailsSheet
        entry={selectedEntry}
        isOpen={showDetailsSheet}
        onClose={() => {
          setShowDetailsSheet(false);
          setSelectedEntry(null);
        }}
        handleDeleteBlocklistEntry={(entry) => handleDelete(entry)}
      />

      <BookingReportEntryDetailsModal
        entry={selectedReport}
        isOpen={showReviewDialog}
        onClose={() => {
          setShowReviewDialog(false);
          setSelectedReport(null);
        }}
      />

      <Dialog open={showDeleteEntryDialog} onOpenChange={setShowDeleteEntryDialog}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("remove_value_from_blocklist", { value: entryToDelete?.value })}
          confirmBtn={
            <DialogClose color="destructive" onClick={confirmDeleteEntry}>
              {t("remove")}
            </DialogClose>
          }>
          {t("remove_value_from_blocklist_description")}
        </ConfirmationDialogContent>
      </Dialog>

      <Dialog open={showDeleteReportDialog} onOpenChange={setShowDeleteReportDialog}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("delete_booking_report")}
          confirmBtn={
            <DialogClose color="destructive" onClick={confirmDeleteReport}>
              {t("delete")}
            </DialogClose>
          }>
          {t("delete_booking_report_confirmation")}
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}
