import React, { SyntheticEvent, useState } from "react";

import { ErrorCode } from "@lib/auth";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";

import Button from "@components/ui/Button";

const ChangePasswordSection = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLocale();

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
      <div className="mt-6">
        <h2 className="font-cal text-lg font-medium leading-6 text-gray-900">{t("change_password")}</h2>
      </div>
      <form className="divide-y divide-gray-200 lg:col-span-9" onSubmit={changePasswordHandler}>
        <div className="py-6 lg:pb-8">
          <div className="flex">
            <div className="w-1/2 ltr:mr-2 rtl:ml-2">
              <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">
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
                  className="focus:border-brand block w-full rounded-sm border-gray-300 shadow-sm focus:ring-black sm:text-sm"
                  placeholder={t("your_old_password")}
                />
              </div>
            </div>
            <div className="ml-2 w-1/2">
              <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
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
                  className="focus:border-brand block w-full rounded-sm border-gray-300 shadow-sm focus:ring-black sm:text-sm"
                  placeholder={t("super_secure_new_password")}
                />
              </div>
            </div>
          </div>
          {errorMessage && <p className="mt-1 text-sm text-red-700">{errorMessage}</p>}
          <div className="flex justify-end py-8">
            <Button type="submit">{t("save")}</Button>
          </div>
          <hr className="mt-4" />
        </div>
      </form>
    </>
  );
};

export default ChangePasswordSection;
