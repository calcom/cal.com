import { getSession, useSession } from "next-auth/client";
import React from "react";

import prisma from "@lib/prisma";

import Loader from "@components/Loader";
import SettingsShell from "@components/Settings";
import Shell from "@components/Shell";
import ChangePasswordSection from "@components/security/ChangePasswordSection";
import TwoFactorAuthSection from "@components/security/TwoFactorAuthSection";

export default function Security({ user }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [session, loading] = useSession();

  if (loading) {
    return <Loader />;
  }

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
    props: { session, user },
  };
}
