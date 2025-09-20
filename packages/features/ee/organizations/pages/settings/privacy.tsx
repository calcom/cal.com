"use client";

import { useState } from "react";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import MakeTeamPrivateSwitch from "@calcom/features/ee/teams/components/MakeTeamPrivateSwitch";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import AddSpamBlocklistDialog from "./components/AddSpamBlocklistDialog";
import SpamBlocklistTable from "./components/SpamBlocklistTable";

const PrivacyView = ({ permissions }: { permissions: { canRead: boolean; canEdit: boolean } }) => {
  const { t } = useLocale();
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const {
    data: spamBlocklist,
    isLoading: isLoadingBlocklist,
    refetch: refetchBlocklist,
  } = trpc.viewer.organizations.listSpamBlocklist.useQuery(
    { organizationId: currentOrg?.id ?? 0 },
    {
      enabled: !!currentOrg?.id && permissions.canRead,
    }
  );

  const deleteSpamEntryMutation = trpc.viewer.organizations.deleteSpamBlocklistEntry.useMutation({
    onSuccess: () => {
      refetchBlocklist();
    },
  });

  const isInviteOpen = !currentOrg?.user.accepted;
  const isDisabled = !permissions.canEdit || isInviteOpen;

  if (!currentOrg) return null;

  const handleDelete = async (entryId: string) => {
    if (window.confirm(t("confirm_delete_spam_entry"))) {
      await deleteSpamEntryMutation.mutateAsync({
        organizationId: currentOrg.id,
        entryId,
      });
    }
  };

  return (
    <LicenseRequired>
      <div className="space-y-6">
        <div>
          <MakeTeamPrivateSwitch
            isOrg={true}
            teamId={currentOrg.id}
            isPrivate={currentOrg.isPrivate}
            disabled={isDisabled}
          />
        </div>

        {/* Spam Blocklist Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-emphasis text-lg font-medium">{t("spam_blocklist")}</h3>
              <p className="text-subtle mt-1 text-sm">{t("spam_blocklist_description")}</p>
            </div>
            {permissions.canEdit && (
              <Button color="primary" StartIcon="plus" onClick={() => setIsAddDialogOpen(true)}>
                {t("add_spam_entry")}
              </Button>
            )}
          </div>

          {isLoadingBlocklist ? (
            <div className="animate-pulse">Loading spam blocklist...</div>
          ) : !spamBlocklist || spamBlocklist.length === 0 ? (
            <EmptyScreen
              Icon="shield"
              headline={t("no_spam_entries")}
              description={t("no_spam_entries_description")}
              buttonRaw={
                permissions.canEdit ? (
                  <Button color="primary" StartIcon="plus" onClick={() => setIsAddDialogOpen(true)}>
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
              currentUserId={currentOrg.user.id}
            />
          )}

          {isAddDialogOpen && (
            <AddSpamBlocklistDialog
              organizationId={currentOrg.id}
              isOpen={isAddDialogOpen}
              onClose={() => setIsAddDialogOpen(false)}
              onSuccess={() => {
                refetchBlocklist();
                setIsAddDialogOpen(false);
              }}
            />
          )}
        </div>
      </div>
    </LicenseRequired>
  );
};

export default PrivacyView;
