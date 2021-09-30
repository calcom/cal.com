import { getSession, useSession } from "next-auth/client";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import React from "react";

import { getOrSetUserLocaleFromHeaders } from "@lib/core/i18n/i18n.utils";
import { useLocale } from "@lib/hooks/useLocale";
import prisma from "@lib/prisma";

import Loader from "@components/Loader";
import SettingsShell from "@components/SettingsShell";
import Shell from "@components/Shell";
import ChangePasswordSection from "@components/security/ChangePasswordSection";
import TwoFactorAuthSection from "@components/security/TwoFactorAuthSection";

export default function Security({ user, localeProp }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [session, loading] = useSession();
  const { locale, t } = useLocale({ localeProp });

  if (loading) {
    return <Loader />;
  }

  return (
    <Shell heading={t("security")} subtitle={t("manage_account_security")}>
      <SettingsShell>
        <ChangePasswordSection localeProp={locale} />
        <TwoFactorAuthSection localeProp={locale} twoFactorEnabled={user.twoFactorEnabled} />
      </SettingsShell>
    </Shell>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  const locale = await getOrSetUserLocaleFromHeaders(context.req);

  if (!session) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      username: true,
      name: true,
      twoFactorEnabled: true,
    },
  });

  return {
    props: {
      localeProp: locale,
      session,
      user,
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
