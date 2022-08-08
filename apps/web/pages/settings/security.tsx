import { IdentityProvider } from "@prisma/client";
import React from "react";

import SAMLConfiguration from "@calcom/features/ee/common/components/SamlConfiguration";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import { identityProviderNameMap } from "@lib/auth";

import SettingsShell from "@components/SettingsShell";
import ChangePasswordSection from "@components/security/ChangePasswordSection";
import DisableUserImpersonation from "@components/security/DisableUserImpersonation";
import TwoFactorAuthSection from "@components/security/TwoFactorAuthSection";

export default function Security() {
  const user = trpc.useQuery(["viewer.me"]).data;
  const { t } = useLocale();
  return (
    <SettingsShell heading={t("security")} subtitle={t("manage_account_security")}>
      <>
        {user && user.identityProvider !== IdentityProvider.CAL ? (
          <>
            <div className="mt-6">
              <h2 className="font-cal text-lg font-medium leading-6 text-gray-900">
                {t("account_managed_by_identity_provider", {
                  provider: identityProviderNameMap[user.identityProvider],
                })}
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {t("account_managed_by_identity_provider_description", {
                provider: identityProviderNameMap[user.identityProvider],
              })}
            </p>
          </>
        ) : (
          <div className="space-y-2 divide-y">
            <ChangePasswordSection />
            <TwoFactorAuthSection twoFactorEnabled={user?.twoFactorEnabled || false} />
            <DisableUserImpersonation disableImpersonation={user?.disableImpersonation ?? true} />
          </div>
        )}

        <SAMLConfiguration teamsView={false} teamId={null} />
      </>
    </SettingsShell>
  );
}
