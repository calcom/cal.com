import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { ButtonProps } from "../button/Button";
import { Button } from "../button/Button";
import { ConfirmationDialogContent } from "../dialog/ConfirmationDialogContent";
import { Dialog, DialogTrigger } from "../dialog/Dialog";

export const DisconnectIntegrationComponent = ({
  label,
  trashIcon,
  isGlobal,
  isModalOpen = false,
  onModalOpen,
  onDeletionConfirmation,
  buttonProps,
  disabled,
  translations = {},
}: {
  label?: string;
  trashIcon?: boolean;
  isGlobal?: boolean;
  isModalOpen: boolean;
  onModalOpen: () => void;
  onDeletionConfirmation: () => void;
  buttonProps?: ButtonProps;
  disabled?: boolean;
  translations?: Record<string, string>;
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
            disabled={isGlobal || disabled}
            {...buttonProps}>
            {label}
          </Button>
        </DialogTrigger>
        <ConfirmationDialogContent
          variety="danger"
          title={translations["remove_app"] || t("remove_app")}
          confirmBtnText={translations["yes_remove_app"] || t("yes_remove_app")}
          translations={translations}
          onConfirm={onDeletionConfirmation}>
          <p className="mt-5">
            {translations["are_you_sure_you_want_to_remove_this_app"] ||
              t("are_you_sure_you_want_to_remove_this_app")}
          </p>
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
};
