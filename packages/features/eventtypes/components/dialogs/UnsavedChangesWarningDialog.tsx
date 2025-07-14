"use client";

import { useRouter } from "next/navigation";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter } from "@calcom/ui/components/dialog";

interface UnsavedChangesWarningDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => Promise<void> | void;
  onDiscard: () => void;
  pendingRoute?: string;
  isSaving?: boolean;
}

export const UnsavedChangesWarningDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  onDiscard,
  pendingRoute,
  isSaving = false,
}: UnsavedChangesWarningDialogProps) => {
  const { t } = useLocale();
  const router = useRouter();

  const handleSave = async () => {
    try {
      await onSave();
      onOpenChange(false);
      if (pendingRoute) {
        router.push(pendingRoute);
      }
    } catch (error) {
      console.error("Failed to save changes:", error);
    }
  };

  const handleDiscard = () => {
    onDiscard();
    onOpenChange(false);
    if (pendingRoute) {
      router.push(pendingRoute);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        title={t("unsaved_changes")}
        description={t("unsaved_changes_warning")}
        Icon="circle-alert"
        type="confirmation">
        <DialogFooter className="mt-6">
          <Button color="minimal" onClick={handleCancel} disabled={isSaving}>
            {t("cancel")}
          </Button>
          <Button color="destructive" onClick={handleDiscard} disabled={isSaving}>
            {t("discard_changes")}
          </Button>
          <Button color="primary" onClick={handleSave} loading={isSaving}>
            {t("save_changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
