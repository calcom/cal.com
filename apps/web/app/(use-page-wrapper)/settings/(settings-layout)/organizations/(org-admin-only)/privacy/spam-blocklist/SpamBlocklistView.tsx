"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";

import AddSpamBlocklistDialog from "./components/AddSpamBlocklistDialog";
import SpamBlocklistTable from "./components/SpamBlocklistTable";

interface SpamBlocklistViewProps {
  organizationId: number;
  permissions: {
    canRead: boolean;
    canEdit: boolean;
  };
}

export default function SpamBlocklistView({ organizationId, permissions }: SpamBlocklistViewProps) {
  const { t } = useLocale();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const {
    data: spamBlocklist,
    isLoading,
    refetch,
  } = trpc.viewer.organizations.listSpamBlocklist.useQuery(
    { organizationId },
    {
      enabled: permissions.canRead,
    }
  );

  const deleteSpamBlocklistMutation = trpc.viewer.organizations.deleteSpamBlocklistEntry.useMutation({
    onSuccess: () => {
      showToast(t("spam_entry_deleted_successfully"), "success");
      refetch();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleDelete = async (entryId: string) => {
    if (window.confirm(t("confirm_delete_spam_entry"))) {
      await deleteSpamBlocklistMutation.mutateAsync({
        organizationId,
        entryId,
      });
    }
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (!permissions.canRead) {
    return (
      <EmptyScreen
        Icon="shield"
        headline={t("unauthorized")}
        description={t("no_permission_spam_blocklist")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">{t("spam_blocklist")}</h2>
          <p className="text-sm text-gray-500">{t("spam_blocklist_description")}</p>
        </div>
        {permissions.canEdit && (
          <Button type="button" StartIcon="plus" onClick={() => setIsAddDialogOpen(true)}>
            {t("add_spam_entry")}
          </Button>
        )}
      </div>

      {!spamBlocklist || spamBlocklist.length === 0 ? (
        <EmptyScreen
          Icon="shield"
          headline={t("no_spam_entries")}
          description={t("no_spam_entries_description")}
          buttonRaw={
            permissions.canEdit ? (
              <Button type="button" StartIcon="plus" onClick={() => setIsAddDialogOpen(true)}>
                {t("add_first_spam_entry")}
              </Button>
            ) : null
          }
        />
      ) : (
        <SpamBlocklistTable
          spamEntries={spamBlocklist}
          onDelete={handleDelete}
          canEdit={permissions.canEdit}
        />
      )}

      {isAddDialogOpen && (
        <AddSpamBlocklistDialog
          organizationId={organizationId}
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onSuccess={() => {
            refetch();
            setIsAddDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
