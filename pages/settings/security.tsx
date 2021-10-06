import React from "react";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

import SettingsShell from "@components/SettingsShell";
import Shell from "@components/Shell";
import ChangePasswordSection from "@components/security/ChangePasswordSection";
import TwoFactorAuthSection from "@components/security/TwoFactorAuthSection";

export default function Security({ user }) {
  return (
    <Shell heading="Security" subtitle="Manage your account's security.">
      <SettingsShell>
        <ChangePasswordSection />
        <TwoFactorAuthSection twoFactorEnabled={user.twoFactorEnabled} />
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
      id: true,
      username: true,
      name: true,
      twoFactorEnabled: true,
    },
  });

  return {
    props: { session, user },
  };
}
