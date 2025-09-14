import { Dialog, DialogContent, DialogFooter, DialogClose, DialogHeader, DialogTitle, DialogDescription } from "@calid/features/ui/components/dialog";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";

interface SecondaryEmailConfirmModalProps {
  email: string;
  onCancel: () => void;
}

const SecondaryEmailConfirmModal = ({ email, onCancel }: SecondaryEmailConfirmModalProps) => {
  const { t } = useLocale();

  return (
    <Dialog open={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("confirm_email")}</DialogTitle>
          <DialogDescription>
            <ServerTrans t={t} i18nKey="confirm_email_description" values={{ email }} />
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose color="primary" onClick={onCancel} data-testid="secondary-email-confirm-done-button">
            {t("done")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SecondaryEmailConfirmModal;
