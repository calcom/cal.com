import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listHandler = async ({ ctx }: ListOptions) => {
  return await prisma.apiKey.findMany({
    where: {
      userId: ctx.user.id,
      OR: [
        {
          NOT: {
            appId: "zapier",
          },
        },
        {
          appId: null,
        },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
};
