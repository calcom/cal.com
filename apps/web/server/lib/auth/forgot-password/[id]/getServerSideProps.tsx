import type { GetServerSidePropsContext } from "next";

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

  return {
    props: {
      isRequestExpired: !resetPasswordRequest,
      requestId: id,
    },
  };
}
