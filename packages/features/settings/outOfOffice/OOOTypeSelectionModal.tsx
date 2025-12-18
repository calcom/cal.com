"use client";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { DialogContent, DialogHeader } from "@calcom/ui/components/dialog";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";

interface OOOTypeSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectOneOff: () => void;
  onSelectGoogleSync: () => void;
}

export const OOOTypeSelectionModal = ({
  open,
  onClose,
  onSelectOneOff,
  onSelectGoogleSync,
}: OOOTypeSelectionModalProps) => {
  const { t } = useLocale();
  const { data: syncStatus, isLoading } = trpc.viewer.ooo.getOOOSyncStatus.useQuery();

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
        <DialogHeader title={t("add_out_of_office")} />

        <div className="flex flex-col gap-4 p-4" data-testid="ooo-type-selection-modal">
          {isLoading ? (
            <SkeletonContainer>
              <div className="flex flex-col gap-4">
                <SkeletonText className="h-20 w-full" />
                <SkeletonText className="h-20 w-full" />
              </div>
            </SkeletonContainer>
          ) : (
            <>
              {/* One-off OOO option */}
              <button
                type="button"
                onClick={onSelectOneOff}
                data-testid="ooo-type-one-off"
                className={classNames(
                  "border-subtle hover:border-emphasis hover:bg-subtle",
                  "flex items-center gap-4 rounded-lg border p-4 text-left transition-colors"
                )}>
                <div className="bg-subtle flex h-12 w-12 items-center justify-center rounded-lg">
                  <Icon name="calendar-plus" className="text-default h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-emphasis font-medium">{t("one_off_ooo")}</h3>
                  <p className="text-subtle text-sm">{t("one_off_ooo_description")}</p>
                </div>
              </button>

              {/* Google Calendar sync option - only show if connected */}
              {syncStatus?.hasGoogleCalendar && (
                <button
                  type="button"
                  onClick={onSelectGoogleSync}
                  data-testid="ooo-type-google-sync"
                  className={classNames(
                    "border-subtle hover:border-emphasis hover:bg-subtle",
                    "flex items-center gap-4 rounded-lg border p-4 text-left transition-colors"
                  )}>
                  <div className="bg-subtle flex h-12 w-12 items-center justify-center rounded-lg">
                    <Icon name="refresh-cw" className="text-default h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-emphasis font-medium">{t("sync_google_calendar_ooo")}</h3>
                    <p className="text-subtle text-sm">{t("sync_google_calendar_ooo_description")}</p>
                    {syncStatus.enabled && (
                      <span className="text-success mt-1 inline-block text-xs font-medium">
                        {t("currently_enabled")}
                      </span>
                    )}
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
