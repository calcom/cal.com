import React, { SyntheticEvent, useState } from "react";

import { ErrorCode } from "@lib/auth";

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

const setupDescriptions = {
  [SetupStep.ConfirmPassword]: "Confirm your current password to get started.",
  [SetupStep.DisplayQrCode]: "Scan the image below with the authenticator app on your phone.",
  [SetupStep.EnterTotpCode]: "Enter the six-digit code from your authenticator app below.",
};

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
  const [step, setStep] = useState(SetupStep.ConfirmPassword);
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [dataUri, setDataUri] = useState("");
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
        setStep(SetupStep.DisplayQrCode);
        return;
      }

      if (body.error === ErrorCode.IncorrectPassword) {
        setErrorMessage("Password is incorrect.");
      } else {
        setErrorMessage("Something went wrong.");
      }
    } catch (e) {
      setErrorMessage("Something went wrong.");
      console.error("Error setting up two-factor authentication", e);
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
        setErrorMessage("Code is incorrect. Please try again.");
      } else {
        setErrorMessage("Something went wrong.");
      }
    } catch (e) {
      setErrorMessage("Something went wrong.");
      console.error("Error enabling up two-factor authentication", e);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={true}>
      <DialogContent>
        <TwoFactorModalHeader
          title="Enable two-factor authentication"
          description={setupDescriptions[step]}
        />

        <WithStep step={SetupStep.ConfirmPassword} current={step}>
          <form onSubmit={handleSetup}>
            <div className="mb-4">
              <label htmlFor="password" className="mt-4 block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  name="password"
                  id="password"
                  required
                  value={password}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  className="block w-full border-gray-300 rounded-sm shadow-sm focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                />
              </div>

              {errorMessage && <p className="mt-1 text-sm text-red-700">{errorMessage}</p>}
            </div>
          </form>
        </WithStep>
        <WithStep step={SetupStep.DisplayQrCode} current={step}>
          <div className="flex justify-center">
            <img src={dataUri} />
          </div>
        </WithStep>
        <WithStep step={SetupStep.EnterTotpCode} current={step}>
          <form onSubmit={handleEnable}>
            <div className="mb-4">
              <label htmlFor="code" className="mt-4 block text-sm font-medium text-gray-700">
                Code
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
                  className="block w-full border-gray-300 rounded-sm shadow-sm focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
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
              className="ml-2"
              onClick={handleSetup}
              disabled={password.length === 0 || isSubmitting}>
              Continue
            </Button>
          </WithStep>
          <WithStep step={SetupStep.DisplayQrCode} current={step}>
            <Button type="submit" className="ml-2" onClick={() => setStep(SetupStep.EnterTotpCode)}>
              Continue
            </Button>
          </WithStep>
          <WithStep step={SetupStep.EnterTotpCode} current={step}>
            <Button
              type="submit"
              className="ml-2"
              onClick={handleEnable}
              disabled={totpCode.length !== 6 || isSubmitting}>
              Enable
            </Button>
          </WithStep>
          <Button color="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnableTwoFactorModal;
