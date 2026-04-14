import { useLocale } from "@calcom/i18n/useLocale";
import { APP_NAME } from "@calcom/lib/constants";
import { Alert, AlertTitle } from "@coss/ui/components/alert";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { CircleAlertIcon } from "@coss/ui/icons";
import { PasswordField } from "@coss/ui/shared/password-field";
import TwoFactor from "@components/auth/TwoFactor";
import type React from "react";
import { forwardRef } from "react";

export type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  /** Submit handler for the 2FA form. */
  onTwoFactorSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  showPasswordField: boolean;
  showTwoFactor: boolean;
  errorMessage?: string;
};

export const DeleteAccountDialog = forwardRef<HTMLInputElement, DeleteAccountDialogProps>(
  function DeleteAccountDialog(
    {
      open,
      onOpenChange,
      onConfirm,
      onTwoFactorSubmit,
      isLoading,
      showPasswordField,
      showTwoFactor,
      errorMessage,
    },
    passwordRef
  ) {
    const { t } = useLocale();

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>{t("delete_account_modal_title")}</DialogTitle>
            <DialogDescription>
              {t("confirm_delete_account_modal", { appName: APP_NAME })}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground text-sm">{t("delete_account_confirmation_message")}</p>
              {showPasswordField && (
                <Field name="password" data-testid="delete-account-password-field">
                  <FieldLabel>{t("password")}</FieldLabel>
                  <PasswordField
                    data-testid="password"
                    name="password"
                    id="password"
                    autoComplete="current-password"
                    required
                    ref={passwordRef}
                  />
                </Field>
              )}

              {showTwoFactor && onTwoFactorSubmit && (
                <form onSubmit={onTwoFactorSubmit} className="pb-4" data-testid="delete-account-2fa">
                  <TwoFactor center={false} />
                </form>
              )}

              {errorMessage && (
                <Alert variant="error">
                  <CircleAlertIcon aria-hidden="true" />
                  <AlertTitle>{errorMessage}</AlertTitle>
                </Alert>
              )}
            </div>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>{t("cancel")}</DialogClose>
            <Button
              variant="destructive"
              data-testid="delete-account-confirm"
              onClick={onConfirm}
              loading={isLoading}>
              {t("delete_my_account")}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    );
  }
);
