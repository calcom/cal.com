import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, ConfirmationDialogContent } from "@calcom/ui/components/dialog";

interface DeleteWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteWebhookDialog({ open, onOpenChange, onConfirm, isPending }: DeleteWebhookDialogProps) {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ConfirmationDialogContent
        variety="danger"
        title={t("delete_webhook")}
        confirmBtnText={t("confirm_delete_webhook")}
        loadingText={t("confirm_delete_webhook")}
        isPending={isPending}
        onConfirm={(e) => {
          e.preventDefault();
          onConfirm();
        }}>
        {t("delete_webhook_confirmation_message", { appName: APP_NAME })}
      </ConfirmationDialogContent>
    </Dialog>
  );
}
