"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";

import {
  BlockedEntriesTable,
  CreateBlocklistEntryModal,
  PendingReportsBadge,
  PendingReportsTable,
  type SortByOption,
} from "@calcom/features/blocklist";
import { useDataTable } from "@calcom/features/data-table";
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
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortByOption>("createdAt");

  const utils = trpc.useUtils();

  const { data: blockedData, isPending: isBlockedPending } =
    trpc.viewer.organizations.listWatchlistEntries.useQuery(
      { limit, offset, searchTerm },
      { placeholderData: keepPreviousData, enabled: activeView === "blocked" }
    );

  const { data: reportsData, isPending: isReportsPending } =
    trpc.viewer.organizations.listBookingReports.useQuery(
      {
        limit,
        offset,
        searchTerm,
        sortBy,
        filters: { hasWatchlist: false, status: ["PENDING"] },
      },
      { placeholderData: keepPreviousData, enabled: activeView === "pending" }
    );

  const { data: pendingReportsCount } = trpc.viewer.organizations.pendingReportsCount.useQuery();

  const { data: entryDetails, isLoading: isDetailsLoading } =
    trpc.viewer.organizations.getWatchlistEntryDetails.useQuery(
      { id: selectedEntryId ?? "" },
      { enabled: !!selectedEntryId }
    );

  const createEntry = trpc.viewer.organizations.createWatchlistEntry.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listWatchlistEntries.invalidate();
      showToast(t("blocklist_entry_created"), "success");
      setShowCreateModal(false);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const deleteEntry = trpc.viewer.organizations.deleteWatchlistEntry.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listWatchlistEntries.invalidate();
      setSelectedEntryId(null);
      showToast(t("blocklist_entry_deleted"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const addToWatchlist = trpc.viewer.organizations.addToWatchlist.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listBookingReports.invalidate();
      await utils.viewer.organizations.listWatchlistEntries.invalidate();
      await utils.viewer.organizations.pendingReportsCount.invalidate();
      showToast(t("blocklist_entry_created"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const dismissReport = trpc.viewer.organizations.dismissBookingReport.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listBookingReports.invalidate();
      await utils.viewer.organizations.pendingReportsCount.invalidate();
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
          {permissions?.canCreate && (
            <Button color="primary" StartIcon="plus" onClick={() => setShowCreateModal(true)}>
              {t("add")}
            </Button>
          )}
        </div>
      </div>

      {activeView === "blocked" ? (
        <BlockedEntriesTable
          scope="organization"
          data={blockedData?.rows ?? []}
          totalRowCount={blockedData?.meta?.totalRowCount ?? 0}
          isPending={isBlockedPending}
          limit={limit}
          searchTerm={searchTerm}
          permissions={permissions}
          onAddClick={() => setShowCreateModal(true)}
          onDelete={(entry) => deleteEntry.mutate({ id: entry.id })}
          isDeleting={deleteEntry.isPending}
          detailsQuery={{ data: entryDetails, isLoading: isDetailsLoading }}
          selectedEntryId={selectedEntryId ?? undefined}
          onSelectEntry={setSelectedEntryId}
        />
      ) : (
        <PendingReportsTable
          scope="organization"
          data={reportsData?.rows ?? []}
          totalRowCount={reportsData?.meta?.totalRowCount ?? 0}
          isPending={isReportsPending}
          limit={limit}
          onAddToBlocklist={(email, type, onSuccess) => addToWatchlist.mutate({ email, type }, { onSuccess })}
          onDismiss={(email, onSuccess) => dismissReport.mutate({ email }, { onSuccess })}
          isAddingToBlocklist={addToWatchlist.isPending}
          isDismissing={dismissReport.isPending}
        />
      )}

      <CreateBlocklistEntryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        scope="organization"
        onCreateEntry={(data) => createEntry.mutate(data)}
        isPending={createEntry.isPending}
      />
    </>
  );
}
