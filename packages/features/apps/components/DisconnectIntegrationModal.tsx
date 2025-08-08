import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@calid/features/ui/components/dialog";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";

export type RemoveAppParams = {
  credentialId: number;
  app?: App["slug"];
  teamId?: number;
  callback: () => void;
};
interface DisconnectIntegrationModalProps {
  credentialId: number | null;
  isOpen: boolean;
  handleModelClose: () => void;
  teamId?: number;
  handleRemoveApp: (params: RemoveAppParams) => void;
  app?: App["slug"] | null;
}

export default function DisconnectIntegrationModal({
  credentialId,
  app,
  isOpen,
  handleModelClose,
  teamId,
  handleRemoveApp,
}: DisconnectIntegrationModalProps) {
  const { t } = useLocale();
  const isPlatform = useIsPlatform();
  return (
    <Dialog open={isOpen} onOpenChange={handleModelClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("remove_app")}</DialogTitle>
          <DialogDescription>{t("are_you_sure_you_want_to_remove_this_app")}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6">
          <Button color="minimal" onClick={handleModelClose}>
            {t("cancel")}
          </Button>

          <Button
            color="destructive"
            onClick={() => {
              if (isPlatform && app && credentialId) {
                handleRemoveApp({
                  credentialId,
                  app,
                  teamId,
                  callback: () => handleModelClose(),
                });
              } else if (credentialId) {
                handleRemoveApp({
                  credentialId,
                  teamId,
                  callback: () => handleModelClose(),
                });
              }
            }}>
            {t("yes_remove_app")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
