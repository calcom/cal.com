import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@coss/ui/components/alert-dialog";
import { Button } from "@coss/ui/components/button";
import { Spinner } from "@coss/ui/components/spinner";

interface DeleteWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteWebhookDialog({ open, onOpenChange, onConfirm, isPending }: DeleteWebhookDialogProps) {
  const { t } = useLocale();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("delete_webhook")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("delete_webhook_confirmation_message", { appName: APP_NAME })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />}>{t("cancel")}</AlertDialogClose>
          <Button
            data-testid="dialog-confirmation"
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending && <Spinner className="absolute" />}
            <span className={isPending ? "invisible" : undefined}>
              {t("confirm_delete_webhook")}
            </span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
