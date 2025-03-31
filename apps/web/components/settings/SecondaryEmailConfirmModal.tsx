import { Dialog } from "@calcom/features/components/controlled-dialog";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";

interface SecondaryEmailConfirmModalProps {
  email: string;
  onCancel: () => void;
}

const SecondaryEmailConfirmModal = ({ email, onCancel }: SecondaryEmailConfirmModalProps) => {
  const { t } = useLocale();

  return (
    <Dialog open={true}>
      <DialogContent
        title={t("confirm_email")}
        description={<ServerTrans t={t} i18nKey="confirm_email_description" values={{ email }} />}
        type="creation"
        data-testid="secondary-email-confirm-dialog">
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
