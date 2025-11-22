"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { DataTableProvider, DataTableToolbar } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { ToggleGroup } from "@calcom/ui/components/form";

import { BlockedEntriesTable } from "./blocklist/blocked-entries-table";
import { CreateBlocklistEntryModal } from "./blocklist/create-blocklist-entry-modal";
import { PendingReportsBadge } from "./blocklist/pending-reports-badge";
import { PendingReportsTable } from "./blocklist/pending-reports-table";

type ViewType = "blocked" | "pending";

export default function SystemBlocklistView() {
  const { t } = useLocale();
  const pathname = usePathname();
  const [activeView, setActiveView] = useState<ViewType>("blocked");
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <DataTableProvider tableIdentifier={pathname}>
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
                    <PendingReportsBadge />
                  </span>
                ),
              },
            ]}
          />
          <DataTableToolbar.SearchBar />
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
        <BlockedEntriesTable onAddClick={() => setShowCreateModal(true)} />
      ) : (
        <PendingReportsTable />
      )}

      <CreateBlocklistEntryModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </DataTableProvider>
  );
}
