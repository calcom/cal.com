"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  BlockedEntriesTable,
  CreateBlocklistEntryModal,
  PendingReportsBadge,
  PendingReportsTable,
  type SortByOption,
} from "@calcom/features/blocklist";
import { DataTableProvider, useDataTable } from "@calcom/features/data-table";
import { DataTableToolbar } from "~/data-table/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { ToggleGroup } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import { BulkDeleteBlocklistEntries } from "../components/BulkDeleteBlocklistEntries";
import { BulkDismissReports } from "../components/BulkDismissReports";

type ViewType = "blocked" | "pending";

function SystemBlocklistContent() {
  const { t } = useLocale();
  const { limit, offset, searchTerm } = useDataTable();
  const [activeView, setActiveView] = useState<ViewType>("blocked");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortByOption>("createdAt");

  const utils = trpc.useUtils();

  const { data: blockedData, isPending: isBlockedPending } = trpc.viewer.admin.watchlist.list.useQuery(
    { limit, offset, searchTerm },
    { placeholderData: keepPreviousData, enabled: activeView === "blocked" }
  );

  const { data: reportsData, isPending: isReportsPending } = trpc.viewer.admin.watchlist.listReports.useQuery(
    {
      limit,
      offset,
      searchTerm,
      sortBy,
      systemFilters: { systemStatus: ["PENDING"] },
    },
    { placeholderData: keepPreviousData, enabled: activeView === "pending" }
  );

  const { data: pendingReportsCount } = trpc.viewer.admin.watchlist.pendingReportsCount.useQuery();

  const { data: entryDetails, isLoading: isDetailsLoading } = trpc.viewer.admin.watchlist.getDetails.useQuery(
    { id: selectedEntryId ?? "" },
    { enabled: !!selectedEntryId }
  );

  const createEntry = trpc.viewer.admin.watchlist.create.useMutation({
    onSuccess: async () => {
      await utils.viewer.admin.watchlist.list.invalidate();
      showToast(t("system_blocklist_entry_created"), "success");
      setShowCreateModal(false);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const deleteEntry = trpc.viewer.admin.watchlist.delete.useMutation({
    onSuccess: async () => {
      await utils.viewer.admin.watchlist.list.invalidate();
      setSelectedEntryId(null);
      showToast(t("system_blocklist_entry_deleted"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const addToWatchlist = trpc.viewer.admin.watchlist.addToWatchlist.useMutation({
    onSuccess: async () => {
      await utils.viewer.admin.watchlist.listReports.invalidate();
      await utils.viewer.admin.watchlist.list.invalidate();
      await utils.viewer.admin.watchlist.pendingReportsCount.invalidate();
      showToast(t("system_blocklist_entry_created"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const dismissReport = trpc.viewer.admin.watchlist.dismissReport.useMutation({
    onSuccess: async () => {
      await utils.viewer.admin.watchlist.listReports.invalidate();
      await utils.viewer.admin.watchlist.pendingReportsCount.invalidate();
      showToast(t("booking_report_dismissed"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ToggleGroup
            value={activeView}
            onValueChange={(value) => {
              if (value) setActiveView(value as ViewType);
            }}
            options={[
              { value: "blocked", label: t("blocked") },
              {
                value: "pending",
                label: (
                  <span className="flex items-center">
                    {t("pending")}
                    <PendingReportsBadge count={pendingReportsCount} />
                  </span>
                ),
              },
            ]}
          />
          <DataTableToolbar.SearchBar />
          {activeView === "pending" && (
            <Dropdown modal={false}>
              <DropdownMenuTrigger asChild>
                <Button type="button" color="secondary" EndIcon="chevron-down">
                  {sortBy === "reportCount" ? t("most_reports") : t("most_recent")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    onClick={() => setSortBy("createdAt")}
                    className={sortBy === "createdAt" ? "font-medium" : ""}>
                    {t("most_recent")}
                  </DropdownItem>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    onClick={() => setSortBy("reportCount")}
                    className={sortBy === "reportCount" ? "font-medium" : ""}>
                    {t("most_reports")}
                  </DropdownItem>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </Dropdown>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeView === "blocked" && (
            <Button color="primary" StartIcon="plus" onClick={() => setShowCreateModal(true)}>
              {t("add")}
            </Button>
          )}
        </div>
      </div>

      {activeView === "blocked" ? (
        <BlockedEntriesTable
          scope="system"
          data={blockedData?.rows ?? []}
          totalRowCount={blockedData?.meta?.totalRowCount ?? 0}
          isPending={isBlockedPending}
          limit={limit}
          searchTerm={searchTerm}
          onAddClick={() => setShowCreateModal(true)}
          onDelete={(entry) => deleteEntry.mutate({ id: entry.id })}
          isDeleting={deleteEntry.isPending}
          detailsQuery={{ data: entryDetails, isLoading: isDetailsLoading }}
          selectedEntryId={selectedEntryId ?? undefined}
          onSelectEntry={setSelectedEntryId}
          enableRowSelection
          renderBulkActions={(selectedEntries, clearSelection) => (
            <BulkDeleteBlocklistEntries entries={selectedEntries} onRemove={clearSelection} />
          )}
        />
      ) : (
        <PendingReportsTable
          scope="system"
          data={reportsData?.rows ?? []}
          totalRowCount={reportsData?.meta?.totalRowCount ?? 0}
          isPending={isReportsPending}
          limit={limit}
          onAddToBlocklist={(email, type, onSuccess) => addToWatchlist.mutate({ email, type }, { onSuccess })}
          onDismiss={(email, onSuccess) => dismissReport.mutate({ email }, { onSuccess })}
          isAddingToBlocklist={addToWatchlist.isPending}
          isDismissing={dismissReport.isPending}
          enableRowSelection
          renderBulkActions={(selectedReports, clearSelection) => (
            <BulkDismissReports reports={selectedReports} onRemove={clearSelection} />
          )}
        />
      )}

      <CreateBlocklistEntryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        scope="system"
        onCreateEntry={(data) => createEntry.mutate(data)}
        isPending={createEntry.isPending}
      />
    </>
  );
}

export default function SystemBlocklistView() {
  const pathname = usePathname();

  return (
    <DataTableProvider tableIdentifier={pathname ?? "system-blocklist"}>
      <SystemBlocklistContent />
    </DataTableProvider>
  );
}
