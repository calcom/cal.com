import type { Dispatch, SetStateAction } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter } from "@calcom/ui/components/dialog";

interface FieldTypeChangeWarningDialogProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  currentFieldType: string;
}

const FieldTypeChangeWarningDialog = (props: FieldTypeChangeWarningDialogProps) => {
  const { t } = useLocale();
  const { isOpen, setIsOpen, currentFieldType } = props;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        title={t("cannot_change_field_type")}
        description={t("cannot_change_field_type_description")}
        Icon="circle-alert">
        <div className="mt-4">
          <p className="text-subtle text-sm">
            {t("field_type_change_data_integrity_warning", { fieldType: currentFieldType })}
          </p>
          <p className="text-subtle mt-2 text-sm">{t("field_type_change_suggestion")}</p>
        </div>
        <DialogFooter className="mt-6">
          <Button onClick={() => setIsOpen(false)} color="minimal">
            {t("understood")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { FieldTypeChangeWarningDialog };
