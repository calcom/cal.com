import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ButtonProps } from "@calcom/ui";
import { Button, ConfirmationDialogContent, Dialog, DialogTrigger } from "@calcom/ui";

export const DisconnectIntegrationComponent = ({
  label,
  trashIcon,
  isGlobal,
  isModalOpen = false,
  onModalOpen,
  onDeletionConfirmation,
  buttonProps,
}: {
  label?: string;
  trashIcon?: boolean;
  isGlobal?: boolean;
  isModalOpen: boolean;
  onModalOpen: () => void;
  onDeletionConfirmation: () => void;
  buttonProps?: ButtonProps;
}) => {
  const { t } = useLocale();

  return (
    <>
      <Dialog open={isModalOpen} onOpenChange={onModalOpen}>
        <DialogTrigger asChild>
          <Button
            color={buttonProps?.color || "destructive"}
            StartIcon={!trashIcon ? undefined : "trash"}
            size="base"
            variant={trashIcon && !label ? "icon" : "button"}
            disabled={isGlobal}
            {...buttonProps}>
            {label}
          </Button>
        </DialogTrigger>
        <ConfirmationDialogContent
          variety="danger"
          title={t("remove_app")}
          confirmBtnText={t("yes_remove_app")}
          onConfirm={onDeletionConfirmation}>
          <p className="mt-5">{t("are_you_sure_you_want_to_remove_this_app")}</p>
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
};
