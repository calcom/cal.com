import type { BaseSyntheticEvent } from "react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useCallbackRef } from "@calcom/lib/hooks/useCallbackRef";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Form, PasswordField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import TwoFactor from "@components/auth/TwoFactor";

import TwoFactorAuthAPI from "./TwoFactorAuthAPI";

interface EnableTwoFactorModalProps {
  open: boolean;
  onOpenChange: () => void;

  /**
   * Called when the user closes the modal without disabling two-factor auth
   */
  onCancel: () => void;

  /**
   * Called when the user enables two-factor auth
   */
  onEnable: () => void;
}

enum SetupStep {
  ConfirmPassword,
  DisplayBackupCodes,
  DisplayQrCode,
  EnterTotpCode,
}

const WithStep = ({
  step,
  current,
  children,
}: {
  step: SetupStep;
  current: SetupStep;
  children: JSX.Element;
}) => {
  return step === current ? children : null;
};

interface EnableTwoFactorValues {
  totpCode: string;
}

const EnableTwoFactorModal = ({ onEnable, onCancel, open, onOpenChange }: EnableTwoFactorModalProps) => {
  const { t } = useLocale();
  const form = useForm<EnableTwoFactorValues>();

  const setupDescriptions = {
    [SetupStep.ConfirmPassword]: t("2fa_confirm_current_password"),
    [SetupStep.DisplayBackupCodes]: t("backup_code_instructions"),
    [SetupStep.DisplayQrCode]: t("2fa_scan_image_or_use_code"),
    [SetupStep.EnterTotpCode]: t("2fa_enter_six_digit_code"),
  };
  const [step, setStep] = useState(SetupStep.ConfirmPassword);
  const [password, setPassword] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [backupCodesUrl, setBackupCodesUrl] = useState("");
  const [dataUri, setDataUri] = useState("");
  const [secret, setSecret] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetState = () => {
    setPassword("");
    setErrorMessage(null);
    setStep(SetupStep.ConfirmPassword);
  };

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await TwoFactorAuthAPI.setup(password);
      const body = await response.json();

      if (response.status === 200) {
        setBackupCodes(body.backupCodes);

        // create backup codes download url
        const textBlob = new Blob([body.backupCodes.map(formatBackupCode).join("\n")], {
          type: "text/plain",
        });
        if (backupCodesUrl) URL.revokeObjectURL(backupCodesUrl);
        setBackupCodesUrl(URL.createObjectURL(textBlob));

        setDataUri(body.dataUri);
        setSecret(body.secret);
        setStep(SetupStep.DisplayQrCode);
        return;
      }

      if (body.error === ErrorCode.IncorrectPassword) {
        setErrorMessage(t("incorrect_password"));
      } else {
        setErrorMessage(t("something_went_wrong"));
      }
    } catch (e) {
      setErrorMessage(t("something_went_wrong"));
      console.error(t("error_enabling_2fa"), e);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEnable({ totpCode }: EnableTwoFactorValues, e: BaseSyntheticEvent | undefined) {
    e?.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await TwoFactorAuthAPI.enable(totpCode);
      const body = await response.json();

      if (response.status === 200) {
        setStep(SetupStep.DisplayBackupCodes);
        return;
      }

      if (body.error === ErrorCode.IncorrectTwoFactorCode) {
        setErrorMessage(`${t("code_is_incorrect")} ${t("please_try_again")}`);
      } else {
        setErrorMessage(t("something_went_wrong"));
      }
    } catch (e) {
      setErrorMessage(t("something_went_wrong"));
      console.error(t("error_enabling_2fa"), e);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleEnableRef = useCallbackRef(handleEnable);

  const totpCode = form.watch("totpCode");

  // auto submit 2FA if all inputs have a value
  useEffect(() => {
    if (totpCode?.trim().length === 6) {
      form.handleSubmit(handleEnableRef.current)();
    }
  }, [form, handleEnableRef, totpCode]);

  const formatBackupCode = (code: string) => `${code.slice(0, 5)}-${code.slice(5, 10)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={step === SetupStep.DisplayBackupCodes ? t("backup_codes") : t("enable_2fa")}
        description={setupDescriptions[step]}
        type="creation">
        <WithStep step={SetupStep.ConfirmPassword} current={step}>
          <form onSubmit={handleSetup}>
            <div className="mb-4">
              <PasswordField
                label={t("password")}
                name="password"
                id="password"
                required
                value={password}
                onInput={(e) => setPassword(e.currentTarget.value)}
              />
              {errorMessage && <p className="mt-1 text-sm text-red-700">{errorMessage}</p>}
            </div>
          </form>
        </WithStep>
        <WithStep step={SetupStep.DisplayQrCode} current={step}>
          <>
            <div className="-mt-3 flex justify-center">
              {
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dataUri} alt="" />
              }
            </div>
            <p data-testid="two-factor-secret" className="mb-4 text-center font-mono text-xs">
              {secret}
            </p>
          </>
        </WithStep>
        <WithStep step={SetupStep.DisplayBackupCodes} current={step}>
          <>
            <div className="mt-5 grid grid-cols-2 gap-1 text-center font-mono md:pl-10 md:pr-10">
              {backupCodes.map((code) => (
                <div key={code}>{formatBackupCode(code)}</div>
              ))}
            </div>
          </>
        </WithStep>
        <Form handleSubmit={handleEnable} form={form}>
          <WithStep step={SetupStep.EnterTotpCode} current={step}>
            <div className="-mt-4 pb-2">
              <TwoFactor center />

              {errorMessage && (
                <p data-testid="error-submitting-code" className="mt-1 text-sm text-red-700">
                  {errorMessage}
                </p>
              )}
            </div>
          </WithStep>
          <DialogFooter className="mt-8" showDivider>
            {step !== SetupStep.DisplayBackupCodes ? (
              <Button
                color="secondary"
                onClick={() => {
                  onCancel();
                  resetState();
                }}>
                {t("cancel")}
              </Button>
            ) : null}
            <WithStep step={SetupStep.ConfirmPassword} current={step}>
              <Button
                type="submit"
                className="me-2 ms-2"
                onClick={handleSetup}
                loading={isSubmitting}
                disabled={password.length === 0 || isSubmitting}>
                {t("continue")}
              </Button>
            </WithStep>
            <WithStep step={SetupStep.DisplayQrCode} current={step}>
              <Button
                type="submit"
                data-testid="goto-otp-screen"
                className="me-2 ms-2"
                onClick={() => setStep(SetupStep.EnterTotpCode)}>
                {t("continue")}
              </Button>
            </WithStep>
            <WithStep step={SetupStep.EnterTotpCode} current={step}>
              <Button
                type="submit"
                className="me-2 ms-2"
                data-testid="enable-2fa"
                loading={isSubmitting}
                disabled={isSubmitting}>
                {t("enable")}
              </Button>
            </WithStep>
            <WithStep step={SetupStep.DisplayBackupCodes} current={step}>
              <>
                <Button
                  color="secondary"
                  data-testid="backup-codes-close"
                  onClick={(e) => {
                    e.preventDefault();
                    resetState();
                    onEnable();
                  }}>
                  {t("close")}
                </Button>
                <Button
                  color="secondary"
                  data-testid="backup-codes-copy"
                  onClick={(e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(backupCodes.map(formatBackupCode).join("\n"));
                    showToast(t("backup_codes_copied"), "success");
                  }}>
                  {t("copy")}
                </Button>
                <a download="cal-backup-codes.txt" href={backupCodesUrl}>
                  <Button color="primary" data-testid="backup-codes-download">
                    {t("download")}
                  </Button>
                </a>
              </>
            </WithStep>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EnableTwoFactorModal;
