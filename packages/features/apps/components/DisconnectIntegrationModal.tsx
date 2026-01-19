import type { JSX } from "react";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";

interface DisconnectIntegrationModalProps {
  credentialId: number | null;
  isOpen: boolean;
  handleModelClose: () => void;
  teamId?: number;
  handleRemoveApp: (params: RemoveAppParams) => void;
  app?: App["slug"] | null;
}

export type RemoveAppParams = {
  credentialId: number;
  app?: App["slug"];
  teamId?: number;
  callback: () => void;
};

export default function DisconnectIntegrationModal({
  credentialId,
  app,
  isOpen,
  handleModelClose,
  teamId,
  handleRemoveApp,
}: DisconnectIntegrationModalProps): JSX.Element {
  const { t } = useLocale();
  const isPlatform = useIsPlatform();

  const handleConfirm = (): void => {
    if (isPlatform && app && credentialId) {
      handleRemoveApp({ credentialId, app, teamId, callback: () => handleModelClose() });
    } else if (credentialId) {
      handleRemoveApp({ credentialId, teamId, callback: () => handleModelClose() });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModelClose}>
      <ConfirmationDialogContent
        variety="danger"
        title={t("remove_app")}
        confirmBtnText={t("yes_remove_app")}
        onConfirm={handleConfirm}>
        <p className="mt-5">{t("are_you_sure_you_want_to_remove_this_app")}</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
