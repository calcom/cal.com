import React from "react";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

import SettingsShell from "@components/SettingsShell";
import Shell from "@components/Shell";
import ChangePasswordSection from "@components/security/ChangePasswordSection";
import TwoFactorAuthSection from "@components/security/TwoFactorAuthSection";
import { useLocale } from '@lib/hooks/useLocale';
import { getOrSetUserLocaleFromHeaders } from '@lib/core/i18n/i18n.utils';
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

export default function Security({ user, localeProp }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { locale, t } = useLocale({ localeProp });
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

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
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
