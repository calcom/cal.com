import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, ConfirmationDialogContent } from "@calcom/ui";

export type RemoveAppParams = { credentialId: number; teamId?: number; callback: () => void };
interface DisconnectIntegrationModalProps {
  credentialId: number | null;
  isOpen: boolean;
  handleModelClose: () => void;
  teamId?: number;
  handleRemoveApp: (params: RemoveAppParams) => void;
}

export default function DisconnectIntegrationModal({
  credentialId,
  isOpen,
  handleModelClose,
  teamId,
  handleRemoveApp,
}: DisconnectIntegrationModalProps) {
  const { t } = useLocale();
  return (
    <Dialog open={isOpen} onOpenChange={handleModelClose}>
      <ConfirmationDialogContent
        variety="danger"
        title={t("remove_app")}
        confirmBtnText={t("yes_remove_app")}
        onConfirm={() => {
          if (credentialId) {
            handleRemoveApp({ credentialId, teamId, callback: () => handleModelClose() });
          }
        }}>
        <p className="mt-5">{t("are_you_sure_you_want_to_remove_this_app")}</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
