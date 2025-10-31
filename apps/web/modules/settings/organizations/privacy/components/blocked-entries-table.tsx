"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { DataTableWrapper, useDataTable } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { ConfirmationDialogContent, Dialog, DialogClose } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";

import { BlocklistEntryDetailsSheet } from "./blocklist-entry-details-sheet";
import { useBlockedEntriesColumns } from "./blocked-entries-columns";

type BlocklistEntry = RouterOutputs["viewer"]["organizations"]["listWatchlistEntries"]["rows"][number];

interface BlockedEntriesTableProps {
  permissions?: {
    canRead: boolean;
    canCreate: boolean;
    canDelete: boolean;
  };
}

export function BlockedEntriesTable({ permissions }: BlockedEntriesTableProps) {
  const { t } = useLocale();
  const { limit, offset, searchTerm } = useDataTable();

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

  const handleViewDetails = (entry: BlocklistEntry) => {
    setSelectedEntry(entry);
    setShowDetailsSheet(true);
  };

  const handleDelete = (entry: BlocklistEntry) => {
    setEntryToDelete(entry);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      deleteWatchlistEntry.mutate({ id: entryToDelete.id });
    }
  };

  const columns = useBlockedEntriesColumns({
    t,
    canDelete: permissions?.canDelete,
    onViewDetails: handleViewDetails,
    onDelete: handleDelete,
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
  });

  return (
    <>
      <DataTableWrapper
        table={table}
        isPending={isPending}
        variant="default"
        paginationMode="standard"
        EmptyView={
          <EmptyScreen
            Icon="phone"
            headline={searchTerm ? t("no_result_found_for", { searchTerm }) : t("no_entries")}
            description={t("no_entries_description")}
            className="bg-muted mb-16"
            iconWrapperClassName="bg-default"
            dashedBorder={false}
          />
        }
        totalRowCount={totalRowCount}
      />

      <BlocklistEntryDetailsSheet
        entry={selectedEntry}
        isOpen={showDetailsSheet}
        onClose={() => {
          setShowDetailsSheet(false);
          setSelectedEntry(null);
        }}
        handleDeleteBlocklistEntry={handleDelete}
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("remove_value_from_blocklist", { value: entryToDelete?.value })}
          confirmBtn={
            <DialogClose color="destructive" onClick={confirmDelete}>
              {t("remove")}
            </DialogClose>
          }>
          {t("remove_value_from_blocklist_description")}
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}
