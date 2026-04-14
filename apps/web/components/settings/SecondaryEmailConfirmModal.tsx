import { useLocale } from "@calcom/i18n/useLocale";
import ServerTrans from "@calcom/lib/components/ServerTrans";
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

interface SecondaryEmailConfirmModalProps {
  email: string;
  onCancel: () => void;
}

const SecondaryEmailConfirmModal = ({ email, onCancel }: SecondaryEmailConfirmModalProps) => {
  const { t } = useLocale();

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogPopup data-testid="secondary-email-confirm-dialog">
        <DialogHeader>
          <DialogTitle>{t("confirm_email")}</DialogTitle>
          <DialogDescription className="break-all">
            <ServerTrans t={t} i18nKey="confirm_email_description" values={{ email }} />
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={<Button data-testid="secondary-email-confirm-done-button" />}
            onClick={onCancel}>
            {t("done")}
          </DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
};

export default SecondaryEmailConfirmModal;
