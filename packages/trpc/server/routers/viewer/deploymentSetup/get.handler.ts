import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

export const getHandler = async () => {
  const deployment = await prisma.deployment.findUnique({
    where: { id: 1 },
    select: { imprintLink: true, privacyLink: true },
  });

  if (!deployment) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found." });
  }

  return deployment;
};
