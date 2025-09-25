import { Button } from "@calid/features/ui/components/button";
import type { ButtonProps } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@calid/features/ui/components/dialog";

import { useLocale } from "@calcom/lib/hooks/useLocale";

export const DisconnectIntegrationComponent = ({
  label,
  trashIcon,
  isGlobal,
  isModalOpen = false,
  onModalOpen,
  onDeletionConfirmation,
  buttonProps,
  disabled,
}: {
  label?: string;
  trashIcon?: boolean;
  isGlobal?: boolean;
  isModalOpen: boolean;
  onModalOpen: () => void;
  onDeletionConfirmation: () => void;
  buttonProps?: ButtonProps;
  disabled?: boolean;
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

        <DialogContent size="default" className="bg-muted">
          <DialogHeader>
            <DialogTitle>{t("remove_app")}</DialogTitle>
            <DialogDescription>{t("are_you_sure_you_want_to_remove_this_app")}</DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6">
            <Button onClick={onDeletionConfirmation} color="destructive">
              {t("yes_remove_app")}
            </Button>
            <Button color="secondary">{t("close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
