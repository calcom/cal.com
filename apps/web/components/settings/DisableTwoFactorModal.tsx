import { useState } from "react";
import { useForm } from "react-hook-form";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Dialog, DialogContent, DialogFooter, Form, PasswordField } from "@calcom/ui";

import BackupCode from "@components/auth/BackupCode";
import TwoFactor from "@components/auth/TwoFactor";

import TwoFactorAuthAPI from "./TwoFactorAuthAPI";

interface DisableTwoFactorAuthModalProps {
  open: boolean;
  onOpenChange: () => void;
  disablePassword?: boolean;
  /** Called when the user closes the modal without disabling two-factor auth */
  onCancel: () => void;
  /** Called when the user disables two-factor auth */
  onDisable: () => void;
}

interface DisableTwoFactorValues {
  backupCode: string;
  totpCode: string;
  password: string;
}

const DisableTwoFactorAuthModal = ({
  onDisable,
  onCancel,
  disablePassword,
  open,
  onOpenChange,
}: DisableTwoFactorAuthModalProps) => {
  const [isDisabling, setIsDisabling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [twoFactorLostAccess, setTwoFactorLostAccess] = useState(false);
  const { t } = useLocale();

  const form = useForm<DisableTwoFactorValues>();

  const resetForm = (clearPassword = true) => {
    if (clearPassword) form.setValue("password", "");
    form.setValue("backupCode", "");
    form.setValue("totpCode", "");
    setErrorMessage(null);
  };

  async function handleDisable({ password, totpCode, backupCode }: DisableTwoFactorValues) {
    if (isDisabling) {
      return;
    }
    setIsDisabling(true);
    setErrorMessage(null);

    try {
      const response = await TwoFactorAuthAPI.disable(password, totpCode, backupCode);
      if (response.status === 200) {
        setTwoFactorLostAccess(false);
        resetForm();
        onDisable();
        return;
      }

      const body = await response.json();
      if (body.error === ErrorCode.IncorrectPassword) {
        setErrorMessage(t("incorrect_password"));
      } else if (body.error === ErrorCode.SecondFactorRequired) {
        setErrorMessage(t("2fa_required"));
      } else if (body.error === ErrorCode.IncorrectTwoFactorCode) {
        setErrorMessage(t("incorrect_2fa"));
      } else if (body.error === ErrorCode.IncorrectBackupCode) {
        setErrorMessage(t("incorrect_backup_code"));
      } else if (body.error === ErrorCode.MissingBackupCodes) {
        setErrorMessage(t("missing_backup_codes"));
      } else {
        setErrorMessage(t("something_went_wrong"));
      }
    } catch (e) {
      setErrorMessage(t("something_went_wrong"));
      console.error(t("error_disabling_2fa"), e);
    } finally {
      setIsDisabling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t("disable_2fa")} description={t("disable_2fa_recommendation")} type="creation">
        <Form form={form} handleSubmit={handleDisable}>
          <div className="mb-8">
            {!disablePassword && (
              <PasswordField
                required
                labelProps={{
                  className: "block text-sm font-medium text-default",
                }}
                {...form.register("password")}
                className="border-default mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-black"
              />
            )}
            {twoFactorLostAccess ? (
              <BackupCode center={false} />
            ) : (
              <TwoFactor center={false} autoFocus={false} />
            )}

            {errorMessage && <p className="mt-1 text-sm text-red-700">{errorMessage}</p>}
          </div>

          <DialogFooter showDivider className="relative mt-5">
            <Button
              color="minimal"
              className="mr-auto"
              onClick={() => {
                setTwoFactorLostAccess(!twoFactorLostAccess);
                resetForm(false);
              }}>
              {twoFactorLostAccess ? t("go_back") : t("lost_access")}
            </Button>
            <Button color="secondary" onClick={onCancel}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              className="me-2 ms-2"
              data-testid="disable-2fa"
              loading={isDisabling}
              disabled={isDisabling}>
              {t("disable")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DisableTwoFactorAuthModal;
