import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const outOfOfficeReasonList = async ({ ctx }: GetOptions) => {
  const outOfOfficeReasons = await prisma.outOfOfficeReason.findMany({
    where: {
      enabled: true,
      OR: [
        // System defaults
        { userId: null },
        // User's custom reasons
        { userId: ctx.user.id },
      ],
    },
  });

  return outOfOfficeReasons;
};
