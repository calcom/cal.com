import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Dialog, DialogContent, showToast, DialogFooter, DialogClose } from "@calcom/ui";
import { FiAlertCircle } from "@calcom/ui/components/icon";

interface DisconnectIntegrationModalProps {
  credentialId: number | null;
  isOpen: boolean;
  handleModelClose: () => void;
}

export default function DisconnectIntegrationModal({
  credentialId,
  isOpen,
  handleModelClose,
}: DisconnectIntegrationModalProps) {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const mutation = trpc.viewer.deleteCredential.useMutation({
    onSuccess: () => {
      showToast(t("app_removed_successfully"), "success");
      handleModelClose();
      utils.viewer.integrations.invalidate();
      utils.viewer.connectedCalendars.invalidate();
    },
    onError: () => {
      showToast(t("error_removing_app"), "error");
      handleModelClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleModelClose}>
      <DialogContent
        title={t("remove_app")}
        description={t("are_you_sure_you_want_to_remove_this_app")}
        type="confirmation"
        Icon={FiAlertCircle}>
        <DialogFooter>
          <DialogClose onClick={handleModelClose} />
          <DialogClose
            color="primary"
            onClick={() => {
              if (credentialId) {
                mutation.mutate({ id: credentialId });
              }
            }}>
            {t("yes_remove_app")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
