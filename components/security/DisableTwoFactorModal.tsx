import { SyntheticEvent, useState } from "react";

import { ErrorCode } from "@lib/auth";

import { Dialog, DialogContent } from "@components/Dialog";
import Button from "@components/ui/Button";

import TwoFactorAuthAPI from "./TwoFactorAuthAPI";
import TwoFactorModalHeader from "./TwoFactorModalHeader";

interface DisableTwoFactorAuthModalProps {
  /**
   * Called when the user closes the modal without disabling two-factor auth
   */
  onCancel: () => void;

  /**
   * Called when the user disables two-factor auth
   */
  onDisable: () => void;
}

const DisableTwoFactorAuthModal = ({ onDisable, onCancel }: DisableTwoFactorAuthModalProps) => {
  const [password, setPassword] = useState("");
  const [isDisabling, setIsDisabling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDisable(e: SyntheticEvent) {
    e.preventDefault();

    if (isDisabling) {
      return;
    }
    setIsDisabling(true);
    setErrorMessage(null);

    try {
      const response = await TwoFactorAuthAPI.disable(password);
      if (response.status === 200) {
        onDisable();
        return;
      }

      const body = await response.json();
      if (body.error === ErrorCode.IncorrectPassword) {
        setErrorMessage("Password is incorrect.");
      } else {
        setErrorMessage("Something went wrong.");
      }
    } catch (e) {
      setErrorMessage("Something went wrong.");
      console.error("Error disabling two-factor authentication", e);
    } finally {
      setIsDisabling(false);
    }
  }

  return (
    <Dialog open={true}>
      <DialogContent>
        <TwoFactorModalHeader
          title="Disable two-factor authentication"
          description="If you need to disable 2FA, we recommend re-enabling it as soon as possible."
        />

        <form onSubmit={handleDisable}>
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

        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <Button
            type="submit"
            className="ml-2"
            onClick={handleDisable}
            disabled={password.length === 0 || isDisabling}>
            Disable
          </Button>
          <Button color="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DisableTwoFactorAuthModal;
