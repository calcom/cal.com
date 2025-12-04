import type { Dispatch, SetStateAction } from "react";
import { useState, useEffect } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { TextAreaField } from "@calcom/ui/components/form";

interface RejectionReasonDialogProps {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
}

export function RejectionReasonDialog({
  isOpenDialog,
  setIsOpenDialog,
  onConfirm,
  isPending = false,
}: RejectionReasonDialogProps) {
  const { t } = useLocale();
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!isOpenDialog) {
      setRejectionReason("");
    }
  }, [isOpenDialog]);

  const handleConfirm = () => {
    onConfirm(rejectionReason);
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent title={t("rejection_reason_title")} description={t("rejection_reason_description")}>
        <div>
          <TextAreaField
            name="rejectionReason"
            label={
              <>
                {t("rejection_reason")}
                <span className="text-subtle font-normal"> ({t("optional")})</span>
              </>
            }
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </div>

        <DialogFooter>
          <DialogClose color="secondary" />
          <Button disabled={isPending} data-testid="rejection-confirm" onClick={handleConfirm}>
            {t("rejection_confirmation")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
