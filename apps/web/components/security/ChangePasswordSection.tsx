import type { SyntheticEvent } from "react";
import { useState } from "react";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, showToast } from "@calcom/ui";

const ChangePasswordSection = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t, isLocaleReady } = useLocale();
  // hold display until the locale is loaded
  if (!isLocaleReady) {
    return null;
  }

  const errorMessages: { [key: string]: string } = {
    [ErrorCode.IncorrectPassword]: t("current_incorrect_password"),
    [ErrorCode.NewPasswordMatchesOld]: t("new_password_matches_old_password"),
  };

  async function changePasswordHandler(e: SyntheticEvent) {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/changepw", {
        method: "PATCH",
        body: JSON.stringify({ oldPassword, newPassword }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200) {
        setOldPassword("");
        setNewPassword("");
        showToast(t("password_has_been_changed"), "success");
        return;
      }

      const body = await response.json();
      setErrorMessage(errorMessages[body.error] || `${t("something_went_wrong")}${t("please_try_again")}`);
    } catch (err) {
      console.error(t("error_changing_password"), err);
      setErrorMessage(`${t("something_went_wrong")}${t("please_try_again")}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form className="divide-subtle divide-y lg:col-span-9" onSubmit={changePasswordHandler}>
        <div className="py-6 lg:pb-5">
          <div className="my-3">
            <h2 className="font-cal text-emphasis text-lg font-medium leading-6">{t("change_password")}</h2>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0">
            <div className="w-full ltr:mr-2 rtl:ml-2 sm:w-1/2">
              <label htmlFor="current_password" className="text-default block text-sm font-medium">
                {t("current_password")}
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  value={oldPassword}
                  onInput={(e) => setOldPassword(e.currentTarget.value)}
                  name="current_password"
                  id="current_password"
                  required
                  className="border-default block w-full rounded-sm text-sm"
                  placeholder={t("your_old_password")}
                />
              </div>
            </div>
            <div className="w-full sm:w-1/2">
              <label htmlFor="new_password" className="text-default block text-sm font-medium">
                {t("new_password")}
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  name="new_password"
                  id="new_password"
                  value={newPassword}
                  required
                  onInput={(e) => setNewPassword(e.currentTarget.value)}
                  className="border-default block w-full rounded-sm text-sm"
                  placeholder={t("super_secure_new_password")}
                />
              </div>
            </div>
          </div>
          {errorMessage && <p className="mt-1 text-sm text-red-700">{errorMessage}</p>}
          <div className="flex py-8 sm:justify-end">
            <Button color="secondary" type="submit">
              {t("save")}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
};

export default ChangePasswordSection;
