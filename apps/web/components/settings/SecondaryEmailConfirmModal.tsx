import { Trans } from "react-i18next";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui";

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
        description={<Trans i18nKey="confirm_email_description" values={{ email }} />}
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
