"use client";

import type { Dispatch, SetStateAction } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter } from "@calcom/ui/components/dialog";

interface FieldTypeChangeWarningDialogProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

const FieldTypeChangeWarningDialog = ({ isOpen, setIsOpen }: FieldTypeChangeWarningDialogProps) => {
  const { t } = useLocale();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        title="Field type change not allowed"
        description="Changing the field type can break data integrity. Existing responses may no longer match the new field type, which could cause issues with your form data."
        Icon="circle-alert">
        <DialogFooter className="mt-6">
          <Button
            onClick={() => {
              setIsOpen(false);
            }}
            color="primary">
            Understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { FieldTypeChangeWarningDialog };
