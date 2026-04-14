import { useLocale } from "@calcom/i18n/useLocale";
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

export type CreatePasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreatePasswordDialog({ open, onOpenChange }: CreatePasswordDialogProps) {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{t("create_account_password")}</DialogTitle>
          <DialogDescription>{t("create_account_password_hint")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>{t("close")}</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
