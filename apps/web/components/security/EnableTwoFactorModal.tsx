import React, { SyntheticEvent, useState } from "react";

import { ErrorCode } from "@lib/auth";
import { useLocale } from "@lib/hooks/useLocale";

import { Dialog, DialogContent } from "@components/Dialog";
import Button from "@components/ui/Button";

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

const EnableTwoFactorModal = ({ onEnable, onCancel }: EnableTwoFactorModalProps) => {
  const { t } = useLocale();
  const setupDescriptions = {
    [SetupStep.ConfirmPassword]: t("2fa_confirm_current_password"),
    [SetupStep.DisplayQrCode]: t("2fa_scan_image_or_use_code"),
    [SetupStep.EnterTotpCode]: t("2fa_enter_six_digit_code"),
  };
  const [step, setStep] = useState(SetupStep.ConfirmPassword);
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [dataUri, setDataUri] = useState("");
  const [secret, setSecret] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSetup(e: SyntheticEvent) {
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

  async function handleEnable(e: SyntheticEvent) {
    e.preventDefault();

    if (isSubmitting || totpCode.length !== 6) {
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
    <Dialog open={true}>
      <DialogContent>
        <TwoFactorModalHeader title={t("enable_2fa")} description={setupDescriptions[step]} />

        <WithStep step={SetupStep.ConfirmPassword} current={step}>
          <form onSubmit={handleSetup}>
            <div className="mb-4">
              <label htmlFor="password" className="mt-4 block text-sm font-medium text-gray-700">
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
                  className="block w-full rounded-sm border-gray-300 shadow-sm focus:border-neutral-900 focus:ring-neutral-900 sm:text-sm"
                />
              </div>

              {errorMessage && <p className="mt-1 text-sm text-red-700">{errorMessage}</p>}
            </div>
          </form>
        </WithStep>
        <WithStep step={SetupStep.DisplayQrCode} current={step}>
          <>
            <div className="flex justify-center">
              <img src={dataUri} />
            </div>
            <p className="text-center font-mono text-xs">{secret}</p>
          </>
        </WithStep>
        <WithStep step={SetupStep.EnterTotpCode} current={step}>
          <form onSubmit={handleEnable}>
            <div className="mb-4">
              <label htmlFor="code" className="mt-4 block text-sm font-medium text-gray-700">
                {t("code")}
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="code"
                  id="code"
                  required
                  value={totpCode}
                  maxLength={6}
                  minLength={6}
                  inputMode="numeric"
                  onInput={(e) => setTotpCode(e.currentTarget.value)}
                  className="block w-full rounded-sm border-gray-300 shadow-sm focus:border-neutral-900 focus:ring-neutral-900 sm:text-sm"
                />
              </div>

              {errorMessage && <p className="mt-1 text-sm text-red-700">{errorMessage}</p>}
            </div>
          </form>
        </WithStep>

        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <WithStep step={SetupStep.ConfirmPassword} current={step}>
            <Button
              type="submit"
              className="ltr:ml-2 rtl:mr-2"
              onClick={handleSetup}
              disabled={password.length === 0 || isSubmitting}>
              {t("continue")}
            </Button>
          </WithStep>
          <WithStep step={SetupStep.DisplayQrCode} current={step}>
            <Button
              type="submit"
              className="ltr:ml-2 rtl:mr-2"
              onClick={() => setStep(SetupStep.EnterTotpCode)}>
              {t("continue")}
            </Button>
          </WithStep>
          <WithStep step={SetupStep.EnterTotpCode} current={step}>
            <Button
              type="submit"
              className="ltr:ml-2 rtl:mr-2"
              onClick={handleEnable}
              disabled={totpCode.length !== 6 || isSubmitting}>
              {t("enable")}
            </Button>
          </WithStep>
          <Button color="secondary" onClick={onCancel}>
            {t("cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnableTwoFactorModal;
