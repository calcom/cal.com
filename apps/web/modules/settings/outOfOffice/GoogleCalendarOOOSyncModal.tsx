"use client";

import { useEffect, useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Switch } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

interface GoogleCalendarOOOSyncModalProps {
  open: boolean;
  onClose: () => void;
}

export const GoogleCalendarOOOSyncModal = ({ open, onClose }: GoogleCalendarOOOSyncModalProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data: syncStatus, isLoading } = trpc.viewer.ooo.getOOOSyncStatus.useQuery();

  const [enabled, setEnabled] = useState(false);

  // Update local state when sync status loads
  useEffect(() => {
    if (syncStatus) {
      setEnabled(syncStatus.enabled);
    }
  }, [syncStatus]);

  const enableSyncMutation = trpc.viewer.ooo.enableGoogleCalendarOOOSync.useMutation({
    onSuccess: (result) => {
      if (result.enabled) {
        showToast(t("ooo_sync_enabled"), "success");
      } else {
        showToast(t("ooo_sync_disabled"), "success");
      }
      utils.viewer.ooo.outOfOfficeEntriesList.invalidate();
      utils.viewer.ooo.getOOOSyncStatus.invalidate();
      onClose();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleSave = () => {
    enableSyncMutation.mutate({
      enabled,
      credentialId: syncStatus?.credentialId ?? undefined,
    });
  };

  const handleToggle = (newEnabled: boolean) => {
    setEnabled(newEnabled);
  };

  if (isLoading) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}>
        <DialogHeader
          title={t("google_calendar_ooo_sync")}
          subtitle={t("google_calendar_ooo_sync_subtitle")}
        />

        <div className="flex flex-col gap-6 px-1 py-4" data-testid="google-calendar-ooo-sync-modal">
          <Alert
            severity="info"
            title={t("ooo_sync_info_title")}
            message={t("ooo_sync_info_message")}
          />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-emphasis font-medium">{t("enable_ooo_sync")}</p>
              <p className="text-subtle text-sm">{t("enable_ooo_sync_description")}</p>
            </div>
            <Switch checked={enabled} onCheckedChange={handleToggle} data-testid="ooo-sync-toggle" />
          </div>

          {syncStatus?.enabled && syncStatus.syncedEntriesCount > 0 && (
            <p className="text-subtle text-sm">
              {t("synced_entries_count", { count: syncStatus.syncedEntriesCount })}
            </p>
          )}

          {enabled && !syncStatus?.enabled && (
            <Alert
              severity="warning"
              title={t("ooo_sync_enable_warning_title")}
              message={t("ooo_sync_enable_warning_message")}
            />
          )}

          {!enabled && syncStatus?.enabled && syncStatus.syncedEntriesCount > 0 && (
            <Alert
              severity="warning"
              title={t("ooo_sync_disable_warning_title")}
              message={t("ooo_sync_disable_warning_message", { count: syncStatus.syncedEntriesCount })}
            />
          )}
        </div>

        <DialogFooter showDivider noSticky>
          <div className="flex">
            <Button color="minimal" type="button" onClick={onClose} className="mr-1" data-testid="ooo-sync-cancel">
              {t("cancel")}
            </Button>
            <Button
              color="primary"
              type="button"
              onClick={handleSave}
              loading={enableSyncMutation.isPending}
              disabled={enabled === syncStatus?.enabled}
              data-testid="ooo-sync-save">
              {t("save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
