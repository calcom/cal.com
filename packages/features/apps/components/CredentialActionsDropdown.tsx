"use client";

import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@calid/features/ui/components/dialog";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { GOOGLE_CALENDAR_TYPE } from "@calcom/platform-constants";
import { trpc } from "@calcom/trpc/react";

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
      triggerToast(t("cache_deleted_successfully"), "success");
      onSuccess?.();
    },
    onError: () => {
      triggerToast(t("error_deleting_cache"), "error");
    },
  });

  const utils = trpc.useUtils();
  const disconnectMutation = trpc.viewer.credentials.calid_delete.useMutation({
    onSuccess: () => {
      triggerToast(t("app_removed_successfully"), "success");
      onSuccess?.();
    },
    onError: () => {
      triggerToast(t("error_removing_app"), "error");
    },
    async onSettled() {
      await utils.viewer.calendars.connectedCalendars.invalidate();
      await utils.viewer.apps.calid_integrations.invalidate();
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
      {/* <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="icon" color="secondary" StartIcon="ellipsis" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {hasCache && (
            <>
              <DropdownMenuItem className="focus:ring-muted" disabled>
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
              <DropdownMenuItem className="outline-none" asChild>
                <ButtonOrLink
                  type="button"
                  color="destructive"
                  className="flex w-full items-center gap-2 text-sm text-red-600"
                  onClick={() => {
                    setDeleteModalOpen(true);
                    setDropdownOpen(false);
                  }}>
                  <Icon name="trash" className="h-4 w-4" />
                  {t("delete_cached_data")}
                </ButtonOrLink>
              </DropdownMenuItem>
            </>
          )}

          {canDisconnect && hasCache && <DropdownMenuSeparator />}

          {canDisconnect && (
            <DropdownMenuItem className="outline-none" asChild>
              <ButtonOrLink
                type="button"
                color="destructive"
                className="flex w-full items-center gap-2 text-sm text-red-600"
                onClick={() => {
                  setDisconnectModalOpen(true);
                  setDropdownOpen(false);
                }}>
                <Icon name="trash" className="h-4 w-4" />
                {t("remove_app")}
              </ButtonOrLink>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu> */}
      <Button
        color="minimal"
        variant="fab"
        size="sm"
        StartIcon="trash-2"
        onClick={() => {
          setDeleteModalOpen(true);
          setDropdownOpen(false);
        }}
      />

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete_cached_data")}</DialogTitle>
            <DialogDescription>{t("confirm_delete_cache")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setDeleteModalOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                deleteCacheMutation.mutate({ credentialId });
                setDeleteModalOpen(false);
              }}>
              {t("yes_delete_cache")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disconnectModalOpen} onOpenChange={setDisconnectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("remove_app")}</DialogTitle>
            <DialogDescription>{t("are_you_sure_you_want_to_remove_this_app")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setDisconnectModalOpen(false)}>
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                disconnectMutation.mutate({ id: credentialId });
                setDisconnectModalOpen(false);
              }}>
              {t("yes_remove_app")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
