import React, { BaseSyntheticEvent, useState } from "react";
import { useForm } from "react-hook-form";

import { ErrorCode } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Dialog, DialogContent, Form, TextField } from "@calcom/ui";

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
    [SetupStep.DisplayQrCode]: t("2fa_scan_image_or_use_code"),
    [SetupStep.EnterTotpCode]: t("2fa_enter_six_digit_code"),
  };
  const [step, setStep] = useState(SetupStep.ConfirmPassword);
  const [password, setPassword] = useState("");
  const [dataUri, setDataUri] = useState("");
  const [secret, setSecret] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        onEnable();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t("enable_2fa")} description={setupDescriptions[step]} type="creation">
        <WithStep step={SetupStep.ConfirmPassword} current={step}>
          <form onSubmit={handleSetup}>
            <div className="mb-4">
              <TextField
                label={t("password")}
                type="password"
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
            <div className="flex justify-center">
              {
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dataUri} alt="" />
              }
            </div>
            <p className="text-center font-mono text-xs">{secret}</p>
          </>
        </WithStep>
        <Form handleSubmit={handleEnable} form={form}>
          <WithStep step={SetupStep.EnterTotpCode} current={step}>
            <div className="mb-4">
              <TwoFactor center />

              {errorMessage && <p className="mt-1 text-sm text-red-700">{errorMessage}</p>}
            </div>
          </WithStep>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <WithStep step={SetupStep.ConfirmPassword} current={step}>
              <Button
                type="submit"
                className="ltr:ml-2 ltr:mr-2 rtl:ml-2"
                onClick={handleSetup}
                disabled={password.length === 0 || isSubmitting}>
                {t("continue")}
              </Button>
            </WithStep>
            <WithStep step={SetupStep.DisplayQrCode} current={step}>
              <Button
                type="submit"
                className="ltr:ml-2 ltr:mr-2 rtl:ml-2"
                onClick={() => setStep(SetupStep.EnterTotpCode)}>
                {t("continue")}
              </Button>
            </WithStep>
            <WithStep step={SetupStep.EnterTotpCode} current={step}>
              <Button type="submit" className="ltr:ml-2 ltr:mr-2 rtl:ml-2" disabled={isSubmitting}>
                {t("enable")}
              </Button>
            </WithStep>
            <Button color="secondary" onClick={onCancel}>
              {t("cancel")}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EnableTwoFactorModal;
