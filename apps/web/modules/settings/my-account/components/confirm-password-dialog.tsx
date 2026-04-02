import { useLocale } from "@calcom/lib/hooks/useLocale";
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
import type React from "react";
import { forwardRef } from "react";

export type ConfirmPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  isLoading: boolean;
  oldEmail: string;
  newEmail?: string;
  errorMessage?: string;
};

export const ConfirmPasswordDialog = forwardRef<HTMLInputElement, ConfirmPasswordDialogProps>(
  function ConfirmPasswordDialog(
    { open, onOpenChange, onConfirm, isLoading, oldEmail, newEmail, errorMessage },
    passwordRef
  ) {
    const { t } = useLocale();

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>{t("confirm_password")}</DialogTitle>
            <DialogDescription>{t("confirm_password_change_email")}</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <span className="text-foreground mb-2 block text-sm font-medium leading-none">
                    {t("old_email_address")}
                  </span>
                  <p className="text-muted-foreground leading-none" data-testid="confirm-password-old-email">{oldEmail}</p>
                </div>
                <div>
                  <span className="text-foreground mb-2 block text-sm font-medium leading-none">
                    {t("new_email_address")}
                  </span>
                  <p className="text-muted-foreground leading-none" data-testid="confirm-password-new-email">{newEmail}</p>
                </div>
              </div>
              <Field name="password">
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
              data-testid="profile-update-email-submit-button"
              loading={isLoading}
              onClick={onConfirm}>
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    );
  }
);
