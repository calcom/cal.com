import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";

type CheckForGCalOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const checkForGCalHandler = async ({ ctx }: CheckForGCalOptions) => {
  const gCalPresent = await prisma.credential.findFirst({
    where: {
      type: "google_calendar",
      userId: ctx.user.id,
    },
  });

  return !!gCalPresent;
};
