import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Dialog, showToast, ConfirmationDialogContent } from "@calcom/ui";

interface DisconnectIntegrationModalProps {
  credentialId: number | null;
  isOpen: boolean;
  handleModelClose: () => void;
  teamId?: number;
}

export default function DisconnectIntegrationModal({
  credentialId,
  isOpen,
  handleModelClose,
  teamId,
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
      <ConfirmationDialogContent
        variety="danger"
        title={t("remove_app")}
        confirmBtnText={t("yes_remove_app")}
        onConfirm={() => {
          if (credentialId) {
            mutation.mutate({ id: credentialId, teamId });
          }
        }}>
        <p className="mt-5">{t("are_you_sure_you_want_to_remove_this_app")}</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
