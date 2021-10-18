import React from "react";

import { getSession, identityProviderNameMap } from "@lib/auth";
import prisma from "@lib/prisma";

import SettingsShell from "@components/Settings";
import Shell from "@components/Shell";
import ChangePasswordSection from "@components/security/ChangePasswordSection";
import TwoFactorAuthSection from "@components/security/TwoFactorAuthSection";

import { IdentityProvider } from ".prisma/client";

interface SecurityProps {
  user: {
    twoFactorEnabled: boolean;
    identityProvider: IdentityProvider;
  };
}

export default function Security({ user }: SecurityProps) {
  return (
    <Shell heading="Security" subtitle="Manage your account's security.">
      <SettingsShell>
        {user.identityProvider !== IdentityProvider.CAL ? (
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
            <TwoFactorAuthSection twoFactorEnabled={user.twoFactorEnabled} />
          </>
        )}
      </SettingsShell>
    </Shell>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
    },
    select: {
      twoFactorEnabled: true,
      identityProvider: true,
    },
  });

  return { props: { user } };
}
