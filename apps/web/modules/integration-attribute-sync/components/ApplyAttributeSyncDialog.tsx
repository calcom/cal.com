import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { Icon } from "@calcom/ui/components/icon";

interface ApplyAttributeSyncDialogProps {
  syncId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ApplyAttributeSyncDialog = ({ syncId, open, onOpenChange }: ApplyAttributeSyncDialogProps) => {
  const { t } = useLocale();
  const [hasApplied, setHasApplied] = useState(false);

  const previewQuery = trpc.viewer.attributeSync.previewApplySync.useQuery(
    { syncId },
    { enabled: open, refetchOnWindowFocus: false }
  );

  const applyMutation = trpc.viewer.attributeSync.applySync.useMutation({
    onSuccess: (data) => {
      showToast(t("attribute_sync_apply_success", { count: data.syncedUserCount }), "success");
      setHasApplied(true);
      onOpenChange(false);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleApply = () => {
    applyMutation.mutate({ syncId });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setHasApplied(false);
    }
    onOpenChange(nextOpen);
  };

  const preview = previewQuery.data;
  const isLoading = previewQuery.isLoading;
  const hasChanges = preview && preview.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title={t("attribute_sync_apply_title")}
        description={t("attribute_sync_apply_description")}
        size="lg"
        enableOverflow>
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Icon name="loader" className="text-subtle h-6 w-6 animate-spin" />
              <span className="text-subtle ml-2 text-sm">{t("attribute_sync_apply_preview_loading")}</span>
            </div>
          )}

          {!isLoading && !hasChanges && (
            <div className="text-subtle py-8 text-center text-sm">
              {t("attribute_sync_apply_no_changes")}
            </div>
          )}

          {!isLoading && hasChanges && (
            <>
              <p className="text-emphasis mb-4 text-sm font-medium">
                {t("attribute_sync_apply_user_changes", { count: preview.length })}
              </p>
              <div className="space-y-3">
                {preview.map((user) => (
                  <div key={user.userId} className="border-subtle rounded-lg border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Icon name="user" className="text-subtle h-4 w-4" />
                      <span className="text-emphasis text-sm font-medium">
                        {user.userName || user.userEmail}
                      </span>
                      {user.userName && (
                        <span className="text-subtle text-xs">{user.userEmail}</span>
                      )}
                    </div>
                    <div className="ml-6 space-y-1">
                      {user.changes.map((change) => (
                        <div
                          key={change.attributeId}
                          className="bg-subtle flex items-center gap-2 rounded px-2 py-1 text-xs">
                          <span className="text-emphasis font-medium">{change.attributeName}</span>
                          <span className="text-subtle">
                            {t("attribute_sync_apply_current_value")}:{" "}
                            <span className="text-default">
                              {change.currentValue || t("attribute_sync_apply_no_value")}
                            </span>
                          </span>
                          <Icon name="arrow-right" className="text-subtle h-3 w-3" />
                          <span className="text-subtle">
                            {t("attribute_sync_apply_new_value")}:{" "}
                            <span className="text-emphasis font-medium">
                              {change.newValue || t("attribute_sync_apply_no_value")}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter showDivider>
          <DialogClose />
          {hasChanges && !hasApplied && (
            <Button
              onClick={handleApply}
              loading={applyMutation.isPending}
              disabled={applyMutation.isPending}>
              {t("attribute_sync_apply_confirm")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyAttributeSyncDialog;
