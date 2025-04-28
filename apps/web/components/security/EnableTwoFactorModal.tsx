import type { BaseSyntheticEvent } from "react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useCallbackRef } from "@calcom/lib/hooks/useCallbackRef";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogContent } from "@calcom/ui/components/dialog";
import { Form } from "@calcom/ui/components/form";

import TwoFactor from "@components/auth/TwoFactor";

import TwoFactorAuthAPI from "./TwoFactorAuthAPI";
import TwoFactorModalHeader from "./TwoFactorModalHeader";

interface EnableTwoFactorModalProps {
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

const EnableTwoFactorModal = ({ onEnable, onCancel }: EnableTwoFactorModalProps) => {
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

  const handleEnableRef = useCallbackRef(handleEnable);

  const totpCode = form.watch("totpCode");

  // auto submit 2FA if all inputs have a value
  useEffect(() => {
    if (totpCode?.trim().length === 6) {
      form.handleSubmit(handleEnableRef.current)();
    }
  }, [form, handleEnableRef, totpCode]);

  return (
    <Dialog open={true}>
      <DialogContent>
        <TwoFactorModalHeader title={t("enable_2fa")} description={setupDescriptions[step]} />

        <WithStep step={SetupStep.ConfirmPassword} current={step}>
          <form onSubmit={handleSetup}>
            <div className="mb-4">
              <label htmlFor="password" className="text-default mt-4 block text-sm font-medium">
                {t("password")}
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  name="password"
                  id="password"
                  required
                  value={password}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  className="border-default block w-full rounded-sm text-sm"
                />
              </div>

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
                className="me-2 ms-2"
                onClick={handleSetup}
                disabled={password.length === 0 || isSubmitting}>
                {t("continue")}
              </Button>
            </WithStep>
            <WithStep step={SetupStep.DisplayQrCode} current={step}>
              <Button type="submit" className="me-2 ms-2" onClick={() => setStep(SetupStep.EnterTotpCode)}>
                {t("continue")}
              </Button>
            </WithStep>
            <WithStep step={SetupStep.EnterTotpCode} current={step}>
              <Button type="submit" className="me-2 ms-2" disabled={isSubmitting}>
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
