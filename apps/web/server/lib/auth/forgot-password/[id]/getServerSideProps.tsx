import { getCsrfToken } from "next-auth/react";

import prisma from "@calcom/prisma";

import type { NextJsLegacyContext } from "@lib/buildLegacyCtx";

export async function getServerSideProps(context: NextJsLegacyContext) {
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

  return {
    props: {
      isRequestExpired: !resetPasswordRequest,
      requestId: id,
      csrfToken: await getCsrfToken({ req: context.req }),
    },
  };
}
