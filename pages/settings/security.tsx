import React from "react";

import SAMLConfiguration from "@ee/components/saml/Configuration";

import { identityProviderNameMap } from "@lib/auth";
import { useLocale } from "@lib/hooks/useLocale";
import { trpc } from "@lib/trpc";

import SettingsShell from "@components/SettingsShell";
import Shell from "@components/Shell";
import ChangePasswordSection from "@components/security/ChangePasswordSection";
import TwoFactorAuthSection from "@components/security/TwoFactorAuthSection";

import { IdentityProvider } from ".prisma/client";

export default function Security() {
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

        <SAMLConfiguration />
      </SettingsShell>
    </Shell>
  );
}
