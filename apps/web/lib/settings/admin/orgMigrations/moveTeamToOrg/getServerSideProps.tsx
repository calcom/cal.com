import type { GetServerSidePropsContext } from "next";
import { getSession } from "next-auth/react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { UserPermissionRole } from "@calcom/prisma/enums";

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getSession(ctx);
  if (!session || !session.user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const isAdmin = session.user.role === UserPermissionRole.ADMIN;
  if (!isAdmin) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }
  return {
    props: {
      error: null,
      migrated: null,
      userId: session.user.id,
      ...(await serverSideTranslations(ctx.locale || "en", ["common"])),
      username: session.user.username,
    },
  };
}
