import { FormEvent, SyntheticEvent, useState } from "react";
import { useForm } from "react-hook-form";

import Button from "@calcom/ui/Button";
import { Dialog, DialogContent } from "@calcom/ui/Dialog";
import { Form, Label } from "@calcom/ui/form/fields";

import { ErrorCode } from "@lib/auth";
import { useLocale } from "@lib/hooks/useLocale";

import TwoFactor from "@components/auth/TwoFactor";

import TwoFactorAuthAPI from "./TwoFactorAuthAPI";
import TwoFactorModalHeader from "./TwoFactorModalHeader";

interface DisableTwoFactorAuthModalProps {
  /** Called when the user closes the modal without disabling two-factor auth */
  onCancel: () => void;
  /** Called when the user disables two-factor auth */
  onDisable: () => void;
}

const DisableTwoFactorAuthModal = ({ onDisable, onCancel }: DisableTwoFactorAuthModalProps) => {
  const [password, setPassword] = useState("");
  const [isDisabling, setIsDisabling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { t } = useLocale();
  const form = useForm<FormEvent<Element>>();
  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();

    if (isDisabling) {
      return;
    }
    setIsDisabling(true);
    setErrorMessage(null);

    try {
      const totpCode = form.getValues("totpCode");
      const response = await TwoFactorAuthAPI.disable(password, totpCode);
      if (response.status === 200) {
        onDisable();
        return;
      }

      const body = await response.json();
      if (body.error === ErrorCode.IncorrectPassword) {
        setErrorMessage(t("incorrect_password"));
      }
      if (body.error === ErrorCode.SecondFactorRequired) {
        setErrorMessage(t("2fa_required"));
      }
      if (body.error === ErrorCode.IncorrectTwoFactorCode) {
        setErrorMessage(t("incorrect_2fa"));
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
    <Dialog open={true}>
      <DialogContent>
        <TwoFactorModalHeader title={t("disable_2fa")} description={t("disable_2fa_recommendation")} />

        <Form form={form} handleSubmit={handleDisable}>
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
                className="block w-full rounded-sm border-gray-300 text-sm"
              />
            </div>
            <Label className="mt-4"> {t("2fa_code")}</Label>

            <TwoFactor center={false} />
            {errorMessage && <p className="mt-1 text-sm text-red-700">{errorMessage}</p>}
          </div>
        </Form>

        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <Button
            type="submit"
            className="ltr:ml-2 rtl:mr-2"
            onClick={handleDisable}
            disabled={password.length === 0 || isDisabling}>
            {t("disable")}
          </Button>
          <Button color="secondary" onClick={onCancel}>
            {t("cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DisableTwoFactorAuthModal;
