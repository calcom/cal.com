"use client";

import { useState } from "react";

import { DataTableToolbar } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { ToggleGroup } from "@calcom/ui/components/form";

import { BlockedEntriesTable } from "./components/blocked-entries-table";
import { CreateBlocklistEntryModal } from "./components/create-blocklist-entry-modal";
import { PendingReportsTable } from "./components/pending-reports-table";

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
  const [activeView, setActiveView] = useState<ViewType>("blocked");
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
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

      {activeView === "blocked" ? (
        <BlockedEntriesTable permissions={permissions} />
      ) : (
        <PendingReportsTable permissions={permissions} />
      )}

      <CreateBlocklistEntryModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </>
  );
}
