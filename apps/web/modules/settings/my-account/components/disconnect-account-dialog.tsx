import { useLocale } from "@calcom/i18n/useLocale";
import { Button } from "@coss/ui/components/button";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@coss/ui/components/alert-dialog";

export type DisconnectAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DisconnectAccountDialog({
  open,
  onOpenChange,
  onConfirm,
}: DisconnectAccountDialogProps) {
  const { t } = useLocale();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("disconnect_account")}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />}>{t("cancel")}</AlertDialogClose>
          <Button onClick={onConfirm}>{t("confirm")}</Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
