"use client";

import { useState } from "react";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import MakeTeamPrivateSwitch from "@calcom/features/ee/teams/components/MakeTeamPrivateSwitch";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";

import AddSpamBlocklistDialog from "./components/AddSpamBlocklistDialog";
import SpamBlocklistTable from "./components/SpamBlocklistTable";

const PrivacyView = ({ permissions }: { permissions: { canRead: boolean; canEdit: boolean } }) => {
  const { t } = useLocale();
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const deleteSpamEntryMutation = trpc.viewer.organizations.deleteSpamBlocklistEntry.useMutation();

  const isInviteOpen = !currentOrg?.user.accepted;
  const isDisabled = !permissions.canEdit || isInviteOpen;

  if (!currentOrg) return null;

  const handleDelete = async (entryId: string) => {
    if (window.confirm(t("confirm_delete_spam_entry"))) {
      await deleteSpamEntryMutation.mutateAsync({
        organizationId: currentOrg.id,
        entryId,
      });
      // The table will automatically refetch its data
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

          <SpamBlocklistTable
            organizationId={currentOrg.id}
            onDelete={handleDelete}
            canEdit={permissions.canEdit}
          />

          {isAddDialogOpen && (
            <AddSpamBlocklistDialog
              organizationId={currentOrg.id}
              isOpen={isAddDialogOpen}
              onClose={() => setIsAddDialogOpen(false)}
              onSuccess={() => {
                setIsAddDialogOpen(false);
                // The table will automatically refetch its data
              }}
            />
          )}
        </div>
      </div>
    </LicenseRequired>
  );
};

export default PrivacyView;
