import React from "react";

import { identityProviderNameMap } from "@lib/auth";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { trpc } from "@lib/trpc";

import SettingsShell from "@components/SettingsShell";
import Shell from "@components/Shell";
import ChangePasswordSection from "@components/security/ChangePasswordSection";
import TwoFactorAuthSection from "@components/security/TwoFactorAuthSection";
import { Alert } from "@components/ui/Alert";
import Button from "@components/ui/Button";

import { IdentityProvider } from ".prisma/client";

export default function Security() {
  const mutation = trpc.useMutation("viewer.updateSAMLConfig", {
    onSuccess: () => {
      showToast(t("saml_config_updated_successfully"), "success");
      setHasErrors(false); // dismiss any open errors
    },
    onError: (err) => {
      setHasErrors(true);
      setErrorMessage(err.message);
      document?.getElementsByTagName("main")[0]?.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const samlConfigRef = React.useRef<HTMLTextAreaElement>(null!);

  const [hasErrors, setHasErrors] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  async function updateSAMLConfigHandler(event) {
    event.preventDefault();

    const rawMetadata = samlConfigRef.current.value;

    mutation.mutate({
      rawMetadata: rawMetadata,
    });
  }

  const user = trpc.useQuery(["viewer.me"]).data;
  const { t } = useLocale();
  return (
    <Shell heading={t("security")} subtitle={t("manage_account_security")}>
      <SettingsShell>
        {user && user.identityProvider !== IdentityProvider.CAL ? (
          <>
            <div className="mt-6">
              <h2 className="font-cal text-lg leading-6 font-medium text-gray-900">
                Your account is managed by {identityProviderNameMap[user.identityProvider]}
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              To change your email, password, enable two-factor authentication and more, please visit your{" "}
              {identityProviderNameMap[user.identityProvider]} account settings.
            </p>
          </>
        ) : (
          <>
            <ChangePasswordSection />
            <TwoFactorAuthSection twoFactorEnabled={user?.twoFactorEnabled || false} />
          </>
        )}

        {user && user.identityProvider === IdentityProvider.SAML ? (
          <form className="divide-y divide-gray-200 lg:col-span-9" onSubmit={updateSAMLConfigHandler}>
            <div className="mt-6">
              <h2 className="font-cal text-lg leading-6 font-medium text-gray-900">SAML Configuration</h2>
            </div>
            {hasErrors && <Alert severity="error" title={errorMessage} />}
            <div className="mt-6">
              <textarea
                ref={samlConfigRef}
                name="saml_config"
                id="saml_config"
                required={true}
                rows={10}
                className="block w-full border-gray-300 rounded-md shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black sm:text-sm"
                placeholder="Please paste the SAML metadata from your Identity Provider here"
              />
            </div>
            <p className="text-sm text-gray-500">
              Please paste the SAML metadata from your Identity Provider in the textbox above to update your
              SAML configuration.
            </p>
            <hr className="mt-8" />
            <div className="flex justify-end py-4">
              <Button type="submit">{t("save")}</Button>
            </div>
          </form>
        ) : null}
      </SettingsShell>
    </Shell>
  );
}
