"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import type { ReactElement } from "react";

interface FeatureOptInSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDismiss: () => void;
  onViewSettings: () => void;
}

export function FeatureOptInSuccessDialog({
  isOpen,
  onClose,
  onDismiss,
  onViewSettings,
}: FeatureOptInSuccessDialogProps): ReactElement {
  const { t } = useLocale();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPopup className="sm:max-w-md" data-testid="feature-opt-in-success-dialog">
        <DialogHeader>
          <DialogTitle data-testid="feature-opt-in-success-dialog-title">
            {t("feature_enabled_successfully")}
          </DialogTitle>
          <DialogDescription>{t("feature_enabled_description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />} onClick={onDismiss}>
            {t("dismiss")}
          </DialogClose>
          <Button data-testid="feature-opt-in-success-dialog-view-settings" onClick={onViewSettings}>
            {t("view_settings")}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

export default FeatureOptInSuccessDialog;
