import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

export type IWaylSetupProps = {
  hasApiKey: boolean;
};

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { req } = ctx;
  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } } as const;
  }

  const credential = await prisma.credential.findFirst({
    where: { type: "waylpayment_payment", userId: session.user.id },
  });

  const hasApiKey = !!(credential?.key as Record<string, string> | null)?.encrypted;

  return { props: { hasApiKey } };
};
