"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { GOOGLE_CALENDAR_TYPE } from "@calcom/platform-constants";
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
  integrationType: string;
  cacheUpdatedAt?: Date | null;
  onSuccess?: () => void;
  delegationCredentialId?: string | null;
  disableConnectionModification?: boolean;
}

export default function CredentialActionsDropdown({
  credentialId,
  integrationType,
  cacheUpdatedAt,
  onSuccess,
  delegationCredentialId,
  disableConnectionModification,
}: CredentialActionsDropdownProps) {
  const { t } = useLocale();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);

  const deleteCacheMutation = trpc.viewer.calendars.deleteCache.useMutation({
    onSuccess: () => {
      showToast(t("cache_deleted_successfully"), "success");
      onSuccess?.();
    },
    onError: () => {
      showToast(t("error_deleting_cache"), "error");
    },
  });

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

  const isGoogleCalendar = integrationType === GOOGLE_CALENDAR_TYPE;
  const canDisconnect = !delegationCredentialId && !disableConnectionModification;
  const hasCache = isGoogleCalendar && cacheUpdatedAt;

  if (!canDisconnect && !hasCache) {
    return null;
  }

  return (
    <>
      <Dropdown open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="icon" color="secondary" StartIcon="ellipsis" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {hasCache && (
            <>
              <DropdownMenuItem className="focus:ring-muted">
                <div className="px-2 py-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{t("cache_status")}</div>
                  <div className="text-xs text-gray-500 dark:text-white">
                    {t("cache_last_updated", {
                      timestamp: new Intl.DateTimeFormat("en-US", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(cacheUpdatedAt)),
                      interpolation: { escapeValue: false },
                    })}
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="outline-none">
                <DropdownItem
                  type="button"
                  color="destructive"
                  StartIcon="trash"
                  onClick={() => {
                    setDeleteModalOpen(true);
                    setDropdownOpen(false);
                  }}>
                  {t("delete_cached_data")}
                </DropdownItem>
              </DropdownMenuItem>
            </>
          )}
          {canDisconnect && hasCache && <hr className="my-1" />}
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

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("delete_cached_data")}
          confirmBtnText={t("yes_delete_cache")}
          onConfirm={() => {
            deleteCacheMutation.mutate({ credentialId });
            setDeleteModalOpen(false);
          }}>
          {t("confirm_delete_cache")}
        </ConfirmationDialogContent>
      </Dialog>

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
