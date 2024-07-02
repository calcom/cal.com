import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { ButtonProps } from "@calcom/ui";
import { Button, ConfirmationDialogContent, Dialog, DialogTrigger, showToast } from "@calcom/ui";

export default function DisconnectIntegration({
  credentialId,
  label,
  trashIcon,
  isGlobal,
  onSuccess,
  buttonProps,
}: {
  credentialId: number;
  label?: string;
  trashIcon?: boolean;
  isGlobal?: boolean;
  onSuccess?: () => void;
  buttonProps?: ButtonProps;
}) {
  const { t } = useLocale();
  const [modalOpen, setModalOpen] = useState(false);
  const utils = trpc.useUtils();

  const mutation = trpc.viewer.deleteCredential.useMutation({
    onSuccess: () => {
      showToast(t("app_removed_successfully"), "success");
      setModalOpen(false);
      onSuccess && onSuccess();
    },
    onError: () => {
      showToast(t("error_removing_app"), "error");
      setModalOpen(false);
    },
    async onSettled() {
      await utils.viewer.connectedCalendars.invalidate();
      await utils.viewer.integrations.invalidate();
    },
  });

  return (
    <>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogTrigger asChild>
          <Button
            color={buttonProps?.color || "destructive"}
            StartIcon={!trashIcon ? undefined : "trash"}
            size="base"
            variant={trashIcon && !label ? "icon" : "button"}
            disabled={isGlobal}
            {...buttonProps}>
            {label && label}
          </Button>
        </DialogTrigger>
        <ConfirmationDialogContent
          variety="danger"
          title={t("remove_app")}
          confirmBtnText={t("yes_remove_app")}
          onConfirm={() => {
            mutation.mutate({ id: credentialId });
          }}>
          <p className="mt-5">{t("are_you_sure_you_want_to_remove_this_app")}</p>
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}
