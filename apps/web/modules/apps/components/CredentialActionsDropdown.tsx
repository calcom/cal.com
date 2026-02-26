"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { Dialog } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { showToast } from "@calcom/ui/components/toast";

interface CredentialActionsDropdownProps {
  credentialId: number;
  onSuccess?: () => void;
  delegationCredentialId?: string | null;
  disableConnectionModification?: boolean;
}

export default function CredentialActionsDropdown({
  credentialId,
  onSuccess,
  delegationCredentialId,
  disableConnectionModification,
}: CredentialActionsDropdownProps) {
  const { t } = useLocale();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);

  const utils = trpc.useUtils();
  const disconnectMutation = trpc.viewer.credentials.delete.useMutation({
    onSuccess: () => {
      showToast(t("app_removed_successfully"), "success");
      onSuccess?.();
    },
    onError: () => {
      showToast(t("error_removing_app"), "error");
    },
    async onSettled() {
      await utils.viewer.calendars.connectedCalendars.invalidate();
      await utils.viewer.apps.integrations.invalidate();
    },
  });

  const canDisconnect = !delegationCredentialId && !disableConnectionModification;

  if (!canDisconnect) {
    return null;
  }

  return (
    <>
      <Dropdown open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="icon" color="secondary" StartIcon="ellipsis" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {canDisconnect && (
            <DropdownMenuItem className="outline-none">
              <DropdownItem
                type="button"
                color="destructive"
                StartIcon="trash"
                onClick={() => {
                  setDisconnectModalOpen(true);
                  setDropdownOpen(false);
                }}>
                {t("remove_app")}
              </DropdownItem>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </Dropdown>

      <Dialog open={disconnectModalOpen} onOpenChange={setDisconnectModalOpen}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("remove_app")}
          confirmBtnText={t("yes_remove_app")}
          onConfirm={() => {
            disconnectMutation.mutate({ id: credentialId });
            setDisconnectModalOpen(false);
          }}>
          {t("are_you_sure_you_want_to_remove_this_app")}
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}
