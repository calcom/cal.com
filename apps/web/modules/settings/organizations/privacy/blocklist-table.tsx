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
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";

import { BlocklistEntryDetailsSheet } from "./components/blocklist-entry-details-sheet";
import { CreateBlocklistEntryModal } from "./components/create-blocklist-entry-modal";

type BlocklistEntry = RouterOutputs["viewer"]["organizations"]["listWatchlistEntries"]["rows"][number];

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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<BlocklistEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<BlocklistEntry | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data, isPending } = trpc.viewer.organizations.listWatchlistEntries.useQuery(
    {
      limit,
      offset,
      searchTerm,
    },
    {
      placeholderData: keepPreviousData,
    }
  );

  const utils = trpc.useUtils();

  const deleteWatchlistEntry = trpc.viewer.organizations.deleteWatchlistEntry.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listWatchlistEntries.invalidate();
      showToast(t("blocklist_entry_deleted"), "success");
      setShowDeleteDialog(false);
      setEntryToDelete(null);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleDelete = (entry: BlocklistEntry) => {
    setEntryToDelete(entry);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      deleteWatchlistEntry.mutate({ id: entryToDelete.id });
    }
  };

  const handleViewDetails = (entry: BlocklistEntry) => {
    setSelectedEntry(entry);
    setShowDetailsSheet(true);
  };

  const totalRowCount = data?.meta?.totalRowCount ?? 0;
  const flatData = useMemo<BlocklistEntry[]>(() => data?.rows ?? [], [data]);

  const columns = useMemo<ColumnDef<BlocklistEntry>[]>(
    () => [
      {
        id: "value",
        header: t("value"),
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
        size: 120,
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => {
          const entry = row.original;
          return (
            <div className="flex items-center justify-end">
              <ButtonGroup combined containerProps={{ className: "border-default" }}>
                <Button
                  color="secondary"
                  variant="icon"
                  StartIcon="eye"
                  onClick={() => handleViewDetails(entry)}
                  tooltip={t("view")}
                />
                {permissions?.canDelete && (
                  <Button
                    color="destructive"
                    variant="icon"
                    StartIcon="trash"
                    onClick={() => handleDelete(entry)}
                    tooltip={t("delete")}
                  />
                )}
              </ButtonGroup>
            </div>
          );
        },
      },
    ],
    [t, permissions?.canDelete]
  );

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
        table={table}
        isPending={isPending}
        variant="default"
        paginationMode="standard"
        totalRowCount={totalRowCount}>
        <div className="flex items-center justify-between">
          <DataTableToolbar.SearchBar />
          <div className="flex items-center gap-2">
            {permissions?.canCreate && (
              <Button color="primary" StartIcon="plus" onClick={() => setShowCreateModal(true)}>
                {t("create_block_entry")}
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
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("delete_blocklist_entry")}
          confirmBtnText={t("delete")}
          onConfirm={confirmDelete}>
          {t("delete_blocklist_entry_confirmation", { value: entryToDelete?.value })}
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}
