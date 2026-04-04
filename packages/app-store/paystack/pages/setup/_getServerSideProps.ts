import type { GetServerSidePropsContext } from "next";

import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const notFound = { notFound: true } as const;

  if (typeof ctx.params?.slug !== "string") return notFound;

  const { req, query } = ctx;
  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } } as const;
  }

  const teamId = query.teamId ? Number(query.teamId) : null;

  await throwIfNotHaveAdminAccessToTeam({ teamId, userId: session.user.id });
  const installForObject = teamId ? { teamId } : { userId: session.user.id };

  const credential = await prisma.credential.findFirst({
    where: {
      type: "paystack_payment",
      ...installForObject,
    },
    select: {
      id: true,
      key: true,
    },
  });

  return {
    props: {
      credentialId: credential?.id ?? null,
    },
  };
};
