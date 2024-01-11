import type { GetServerSidePropsContext } from "next";
import { getCsrfToken } from "next-auth/react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { getLocale } from "@calcom/features/auth/lib/getLocale";
import prisma from "@calcom/prisma";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const id = context.params?.id as string;

  let resetPasswordRequest = await prisma.resetPasswordRequest.findFirst({
    where: {
      id,
      expires: {
        gt: new Date(),
      },
    },
    select: {
      email: true,
    },
  });
  try {
    resetPasswordRequest &&
      (await prisma.user.findUniqueOrThrow({ where: { email: resetPasswordRequest.email } }));
  } catch (e) {
    resetPasswordRequest = null;
  }
  const locale = await getLocale(context.req);
  return {
    props: {
      isRequestExpired: !resetPasswordRequest,
      requestId: id,
      csrfToken: await getCsrfToken({ req: context.req }),
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
